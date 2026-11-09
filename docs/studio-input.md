# Studio input and PDF diagram reading

This change completes the input/material-reading step on top of
`feat/end-to-end-prototype` (`4553214`). It also adds the requested AI diagram
reading. The follow-up course-quality checks are documented in
[`studio-quality.md`](studio-quality.md); quiz scoring and the rest of the R4
plan remain separate work.

## Input contract

- Accept PDF and UTF-8 Markdown, TXT and CSV. CSV is teaching text, not a roster.
- Up to five files, 12 MiB per file and 14 MiB combined. Next's request ceiling
  remains 16 MB; browser checks leave room for multipart framing.
- Without a file, require a brief of at least 20 characters. Briefs are limited
  to 12,000 characters; titles to 200.
- Empty named files, unsupported types, invalid UTF-8 and binary text produce
  named, actionable errors. The unused browser file-picker placeholder is not
  mistaken for a real empty file.
- Validate all file metadata before reading files. If any selected file cannot
  be read, stop before generation or saving; never silently omit that file.
- Replacing/clearing a file selection and React's post-action native reset keep
  the displayed file list consistent with the next submission.

## PDF diagrams

The checkbox **Understand PDF diagrams with AI** is on by default. A PDF can
contain at most 100 pages. Normal selectable text is retained, then PDF drawing
operations are inspected for raster images and vector graphics. This is broad
graphics detection: logos, backgrounds and decorations may also be selected.

For visual reading, use one PDF per generation and at most four visual pages.
Other text files can accompany it within the normal upload limits. Leave
**Diagram pages** empty to detect pages automatically, or supply page numbers
such as `2,5-7`. An oversized automatic selection produces an error asking for
an explicit smaller selection; it does not silently analyze the first four.
Manual selections report other detected graphic pages that were not reviewed.

Selected whole pages are rendered to PNG with a maximum edge of 1400 pixels.
Sending the whole page retains arrows, labels and layout, including vector
flowcharts that embedded-image extraction would miss. The vision model returns
page-numbered observations and uncertainties. These are kept separate from
the PDF's original text and supplied to the course generator as AI
interpretations requiring instructor review. Rendered images are transient and
are not stored in the database.

Turning the checkbox off extracts selectable text only and explicitly reports
that diagrams/image text were not read. Image-only scans require visual
reading. Missing credentials, unavailable models, rendering failures and
invalid model responses are explicit errors when visual reading is requested.

## Model configuration

Copy `.env.example` to local configuration as needed. DeepSeek is preferred
when `DEEPSEEK_API_KEY` is present; `DEEPSEEK_MODEL` and
`DEEPSEEK_VISION_MODEL` default to `deepseek-flash`. ChatAnywhere is the next
provider. OpenRouter visual use requires `OPENROUTER_VISION_MODEL`; its free
text-only chain is not used for images. All calls use the existing shared
queue in `lib/llm.ts`. A visual batch has a 25-second total deadline and at most
two attempts; a following outline call has a 20-second deadline. Image-reading
prompts treat supplied material as data, require exact requested page IDs and
separate visible observations from uncertainty.

The native renderer is externalized in `next.config.ts` so Next does not bundle
its platform-specific binary as JavaScript. No deployment is performed.

Official references: [DeepSeek vision](https://api-docs.deepseek.com/guides/vision/)
and [unpdf rendering](https://github.com/unjs/unpdf#renderpageasimage).

## Regression evidence

| Before | After |
| --- | --- |
| Oversize/empty files disappeared during filtering | Validation identifies the file and stops the submission |
| One or two uploaded sections could be replaced by the default brief | Uploaded headings/prose remain the material source |
| PDF diagrams and scans were not understood | Optional whole-page vision handles raster and vector figures |
| File chips could survive a native picker reset | Display follows the actual input; Clear files is available |
| Text-model fallbacks could not accept images | Visual calls use a separate compatible model chain |

Run `npm run test:studio-input`, `npm run typecheck` and `npm run build`.
Use Node.js 22 or newer (the installed unpdf version requires it); verification
here used Node.js 24.
Regression tests use real synthetic PDFs and mock provider/storage calls; they
never read local credentials or contact the model/database. The local browser
smoke uses an isolated form harness with the actual StudioBrief component;
it does not authenticate against or write to the shared database.

Live verification on 2026-11-09 used a synthetic Client → API → Database PDF.
DeepSeek correctly described both left-to-right arrows, identified the three
nodes and explicitly noted that protocol details and response arrows were not
shown. Its interpretation then reached a four-module model-generated outline.
This is a check of that fixture, not a claim of perfect interpretation of
arbitrary teaching diagrams. A later browser test completed course generation,
save and publish in an isolated PGlite database. Integration against the team's
PostgreSQL environment still needs to be verified.
