import { getDocumentProxy, getResolvedPDFJS, renderPageAsImage } from "unpdf";
import { getMaterialExtension, MAX_PDF_PAGES, MAX_VISUAL_PAGES, validateMaterialFile } from "./studio-input.ts";
import { llmVisionConfigured } from "./llm.ts";
import { summarizePdfPages } from "./pdf-vision.ts";
import type { AiAuditEntry } from "./ai-audit";

export type SourceDoc = {
  name: string;
  pages: number;
  text: string;
  /** Kept separate so an AI interpretation cannot replace the original text. */
  visual?: { text: string; pages: number[]; model: string; provider: string; ms: number; auditRuns?: AiAuditEntry[] };
  warnings?: string[];
};

type SourceReadOptions = {
  /** Opt-in: selected PDF pages are sent to the configured vision provider. */
  includeVisuals?: boolean;
  /** One-based PDF pages; overrides automatic graphics detection. */
  visualPages?: number[];
  /** The caller shares this budget across all files in one submission. */
  maxVisualPages?: number;
};

const MAX_RENDER_EDGE = 1_400;

/** An expected upload failure whose message is safe to display in Studio. */
export class SourceReadError extends Error {
  constructor(message: string, readonly auditRuns: AiAuditEntry[] = []) {
    super(message);
    this.name = "SourceReadError";
  }
}

/** Read teaching material; CSV is source text, not an enrolment import. */
export async function readSource(file: File, options: SourceReadOptions = {}): Promise<SourceDoc> {
  const issue = validateMaterialFile(file);
  if (issue) throw new SourceReadError(issue);

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    throw new SourceReadError(`${file.name}: the file could not be read. Please select it again.`);
  }

  if (getMaterialExtension(file.name) === "pdf") {
    // PDF readers permit a header within the first 1024 bytes, not just byte 0.
    const header = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
    if (!header.includes("%PDF-")) {
      throw new SourceReadError(`${file.name}: this is not a valid PDF. Export the original material as a PDF and try again.`);
    }

    let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
    try {
      pdf = await getDocumentProxy(bytes, { maxImageSize: 16_777_216 });
      if (pdf.numPages > MAX_PDF_PAGES) {
        throw new SourceReadError(`${file.name}: PDFs are limited to ${MAX_PDF_PAGES} pages. Export only the relevant pages and upload again.`);
      }

      // Inspect sequentially rather than fan out unpdf's all-page extraction.
      // Raster extraction alone misses vector flowcharts: their boxes and arrows
      // are PDF drawing operations, not embedded bitmap images.
      const { OPS } = await getResolvedPDFJS();
      const graphicOps = new Set([
        OPS.paintImageMaskXObject, OPS.paintImageMaskXObjectGroup,
        OPS.paintImageXObject, OPS.paintInlineImageXObject,
        OPS.paintInlineImageXObjectGroup, OPS.paintImageXObjectRepeat,
        OPS.paintImageMaskXObjectRepeat, OPS.paintSolidColorImageMask,
        OPS.constructPath, OPS.stroke, OPS.closeStroke, OPS.fill, OPS.eoFill,
        OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke,
        OPS.closeEOFillStroke, OPS.shadingFill, OPS.rawFillPath,
      ]);
      const pageTexts: string[] = [];
      const detectedPages: number[] = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        pageTexts.push(content.items
          .filter((item): item is typeof item & { str: string; hasEOL: boolean } => "str" in item)
          .map((item) => item.str + (item.hasEOL ? "\n" : ""))
          .join(""));
        if (options.includeVisuals) {
          const operators = await page.getOperatorList();
          if (operators.fnArray.some((operator) => graphicOps.has(operator))) detectedPages.push(pageNumber);
        }
      }
      const text = pageTexts.join("\n").replace(/[^\S\n]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n");
      const source: SourceDoc = { name: file.name, pages: pdf.numPages, text };
      if (!options.includeVisuals) {
        source.warnings = [`${file.name}: selectable text only; diagrams and text inside images were not analyzed.`];
      }

      if (options.includeVisuals) {
        const budget = Math.min(MAX_VISUAL_PAGES, Math.max(0, Math.floor(options.maxVisualPages ?? MAX_VISUAL_PAGES)));
        if (!Number.isFinite(budget)) throw new SourceReadError(`${file.name}: the PDF visual page budget is invalid.`);
        const manual = options.visualPages !== undefined;
        const selected = [...new Set(manual ? options.visualPages : detectedPages)].sort((a, b) => a - b);
        if (selected.some((page) => !Number.isInteger(page) || page < 1 || page > pdf!.numPages)) {
          throw new SourceReadError(`${file.name}: visual page numbers must be whole numbers from 1 to ${pdf.numPages}.`);
        }
        if (selected.length > budget) {
          throw new SourceReadError(`${file.name}: ${selected.length} pages contain graphics or were selected, but only ${budget} visual pages remain in this submission (maximum ${MAX_VISUAL_PAGES} total). Select fewer PDF pages, export a shorter PDF, or turn off PDF visual analysis to use selectable text only. Graphics detection can also include logos and page decorations.`);
        }
        const blankPage = selected.find((page) => !detectedPages.includes(page) && !pageTexts[page - 1].trim());
        if (blankPage !== undefined) {
          throw new SourceReadError(`${file.name}: page ${blankPage} is blank and has no text or graphics to analyze. Select a page with teaching content.`);
        }
        const omitted = detectedPages.filter((page) => !selected.includes(page));
        if (manual && omitted.length > 0) {
          source.warnings = [`${file.name}: visual analysis is limited to selected pages ${selected.join(", ") || "(none)"}; ${omitted.length} other page(s) with graphics were not visually reviewed. Their selectable text is still included.`];
        }

        if (selected.length > 0) {
          if (!llmVisionConfigured()) {
            throw new SourceReadError(`${file.name}: PDF visual analysis needs a configured vision model. Configure a vision provider, or turn off PDF visual analysis to use selectable text only.`);
          }
          const images: { page: number; dataUrl: string }[] = [];
          for (const pageNumber of selected) {
            try {
              const page = await pdf.getPage(pageNumber);
              const viewport = page.getViewport({ scale: 1 });
              const edge = Math.max(viewport.width, viewport.height);
              if (!Number.isFinite(edge) || edge <= 0) throw new Error("invalid page dimensions");
              const dataUrl = await renderPageAsImage(pdf, pageNumber, {
                canvasImport: () => import("@napi-rs/canvas"),
                scale: Math.min(2, MAX_RENDER_EDGE / edge),
                toDataURL: true,
              });
              images.push({ page: pageNumber, dataUrl });
            } catch {
              throw new SourceReadError(`${file.name}: page ${pageNumber} could not be rendered for visual analysis. Try another PDF export, select different pages, or turn off PDF visual analysis to use selectable text only.`);
            }
          }
          let result: Awaited<ReturnType<typeof summarizePdfPages>>;
          try {
            result = await summarizePdfPages(images, { fileName: file.name, timeoutMs: 25_000 });
          } catch {
            throw new SourceReadError(`${file.name}: PDF visual analysis is temporarily unavailable. Try again, or turn it off to use selectable text only.`);
          }
          if (!result.ok) {
            const detail = result.reason === "not_configured"
              ? "no vision model is configured"
              : result.reason === "invalid_response"
                ? "the vision model did not return usable descriptions"
                : "the vision provider did not return a usable response";
            throw new SourceReadError(`${file.name}: visual analysis failed because ${detail}. Try again, select clearer pages, or turn off PDF visual analysis to use selectable text only.`, result.auditRuns);
          }
          if (!text.trim() && !result.hasTeachingContent) {
            throw new SourceReadError(`${file.name}: the selected pages are blank or entirely unreadable. Upload clearer teaching material.`, result.auditRuns);
          }
          source.visual = { text: result.text, pages: result.pages, model: result.model, provider: result.provider, ms: result.ms, auditRuns: result.auditRuns };
        }
      }

      if (!source.text.trim() && !source.visual?.text.trim()) {
        throw new SourceReadError(`${file.name}: no usable teaching text was found. Enable PDF visual analysis for scanned pages and diagrams, or upload a PDF with selectable text. A blank PDF cannot be used.`);
      }
      return source;
    } catch (error) {
      if (error instanceof SourceReadError) throw error;
      if (error instanceof Error && error.name === "PasswordException") {
        throw new SourceReadError(`${file.name}: password-protected PDFs are not supported. Upload an unlocked copy.`);
      }
      throw new SourceReadError(`${file.name}: the PDF could not be parsed. It may be damaged or encrypted; upload a readable, unlocked PDF.`);
    } finally {
      // unpdf leaves caller-owned proxies alive, including on extraction errors.
      if (pdf) await pdf.loadingTask.destroy().catch(() => undefined);
    }
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new SourceReadError(`${file.name}: the text is not valid UTF-8. Save it as UTF-8 and upload it again.`);
  }

  if (/[\u0000-\u0008\u000B\u000E-\u001F\u007F-\u009F]/u.test(text)) {
    throw new SourceReadError(`${file.name}: the file contains binary data or unsupported control characters. Upload a plain UTF-8 text file.`);
  }
  if (!text.trim()) {
    throw new SourceReadError(`${file.name}: the file contains only whitespace. Add teaching material before uploading.`);
  }

  return { name: file.name, pages: 1, text };
}
