/** Shared by the file picker and the server; browser accept filters are only hints. */
export const MATERIAL_EXTENSIONS = ["pdf", "md", "txt", "csv"] as const;
export const MATERIAL_ACCEPT = ".pdf,.md,.txt,.csv,application/pdf,text/plain,text/markdown,text/csv";
export const MAX_FILE_BYTES = 12 * 1024 * 1024;
// Leave room for the brief and multipart framing under Next's 16 MB request limit.
export const MAX_TOTAL_BYTES = 14 * 1024 * 1024;
export const MAX_MATERIAL_FILES = 5;
export const MIN_BRIEF_CHARS = 20;
export const MAX_BRIEF_CHARS = 12_000;
export const MAX_TITLE_CHARS = 200;
export const MAX_VISUAL_PAGES = 4;
export const MAX_PDF_PAGES = 100;
export const MATERIAL_HELP = "PDF, or UTF-8 MD, TXT and CSV. CSV is read as text, not as a student roster. Up to 5 files, 12 MB each, 14 MB combined. PDFs may contain up to 100 pages.";

type MaterialFile = { name: string; size: number };

export function isEmptyMaterialPlaceholder(file: MaterialFile & { type: string }): boolean {
  // React's multipart action transport may name an unused picker "undefined".
  // Named teaching files such as empty.txt must still reach the empty-file check.
  return file.size === 0 && (file.name === "" || (file.name === "undefined" && file.type === "application/octet-stream"));
}

export function getMaterialExtension(name: string): string {
  return /\.([a-z0-9]+)$/i.exec(name)?.[1].toLowerCase() ?? "";
}

export function validateMaterialFile(file: MaterialFile): string | null {
  if (!MATERIAL_EXTENSIONS.some((extension) => extension === getMaterialExtension(file.name))) {
    return `${file.name}: unsupported file type. Use PDF, MD, TXT or CSV; export slides to a text-based PDF first.`;
  }
  if (file.size === 0) return `${file.name}: this file is empty. Choose a file with teaching content.`;
  if (file.size > MAX_FILE_BYTES) return `${file.name}: exceeds the 12 MB per-file limit.`;
  return null;
}

export function validateMaterials(files: readonly MaterialFile[]): string | null {
  if (files.length > MAX_MATERIAL_FILES) return "Choose no more than 5 source files at a time.";
  for (const file of files) {
    const error = validateMaterialFile(file);
    if (error) return error;
  }
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
    return "The source files exceed the 14 MB combined limit. Choose fewer or smaller files.";
  }
  return null;
}

export function validateStudioInput(input: {
  title: string;
  brief: string;
  files: readonly MaterialFile[];
  includeVisuals?: boolean;
  visualPageRange?: string;
}): string | null {
  const materialError = validateMaterials(input.files);
  if (materialError) return materialError;
  if (input.title.length > MAX_TITLE_CHARS) return "Keep the course title within 200 characters.";
  if (input.brief.length > MAX_BRIEF_CHARS) return "Keep the brief within 12,000 characters.";
  if (input.files.length === 0 && input.brief.trim().length < MIN_BRIEF_CHARS) {
    return "Add a source file, or write a brief of at least 20 characters describing what learners should be able to do.";
  }
  const pdfs = input.files.filter((file) => getMaterialExtension(file.name) === "pdf");
  if (input.includeVisuals && pdfs.length > 1) return "AI diagram reading supports one PDF per generation. Keep one PDF, or turn off diagram reading to extract text from multiple PDFs.";
  if (input.includeVisuals && pdfs.length > 0) return parseVisualPages(input.visualPageRange ?? "").error;
  return null;
}

/** An empty range requests automatic detection; a range explicitly selects pages. */
export function parseVisualPages(value: string): { pages: number[]; error: string | null } {
  const range = value.trim();
  const invalid = { pages: [], error: "Use page numbers such as 2,5-7, within pages 1–100 and no more than 4 pages." };
  if (!range) return { pages: [], error: null };
  if (range.length > 100) return invalid;
  const pages = new Set<number>();
  for (const part of range.split(",")) {
    const match = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(part);
    if (!match) return invalid;
    const first = Number(match[1]);
    const last = Number(match[2] ?? match[1]);
    if (first < 1 || last < first || last > MAX_PDF_PAGES || last - first >= MAX_VISUAL_PAGES) return invalid;
    for (let page = first; page <= last; page += 1) pages.add(page);
    if (pages.size > MAX_VISUAL_PAGES) return invalid;
  }
  return { pages: [...pages].sort((a, b) => a - b), error: null };
}
