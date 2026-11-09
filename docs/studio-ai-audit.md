# Studio generation and teacher review records

This change records Studio's PDF-vision and outline calls separately. It also
keeps failed attempts that do not lead to a course, and records an explicit
staff confirmation when a generated course is published. It does not claim to
audit calls made by other features such as the self-directed path builder.

## What is recorded

- Each attempted provider request records its purpose, provider, returned model
  (or requested model if the response does not name one), fixed prompt version,
  duration, outcome, and the input/output token counts actually returned.
  A timeout or a provider response without a valid count is shown as unknown.
- Separate entries indicate a model response rejected by quality checks and a
  template fallback. Attempts include whether a request was sent and, when
  available, its HTTP status. PDF entries also contain the filename and selected
  page numbers. They do not contain API keys, images, raw source text, or the
  filled-in prompt.
- Provider responses do not reliably include a final billed amount, so cost is
  stored as null and displayed as unknown. Missing token counts do not mean zero
  usage; an upstream timeout may still have consumed tokens.
- Prompt versions are SHA-256 fingerprints of the fixed system and user
  templates in `lib/prompts.ts`. The templates are registered in
  `PromptVersion` in the same transaction as the course or unattached attempt.
  The supplied teaching material is not stored in the prompt registry; the
  registry therefore cannot reconstruct an exact request by itself.
- If material processing or final quality validation fails after a model call,
  attempts are stored without a course and are visible only in the initiating
  staff account's recent attempts on Studio. If the database is unavailable,
  the screen says that the attempt record could not be saved. A process crash
  before the server can write the records cannot be reconstructed reliably.

## Review

Draft creation does not record acceptance. A generated course's editor asks
the staff member to confirm review before publishing. The server checks that
confirmation again; the review row records who confirmed and the published
course version, in the same transaction as the version snapshot. The snapshot
includes activity payloads and rubrics. If publishing adds missing activity
bodies, publication stops so the teacher can review that new content first.

Older `AiRun.acceptedBy` values were set during draft creation and are not
evidence of a teacher review. They are preserved but displayed as unknown.
An explicit new confirmation creates a separate `AiReview` row. Reviews are
historical statements about the published snapshot, not an automatic check that
later edits are correct; staff must review again after changes. Existing demo
login selects an identity rather than proving a real person's identity.

## Database change

`prisma/changes/20261109_ai_audit.sql` is generated from repository baseline
`4553214` and the current Prisma schema. It adds the vision enum value, nullable
usage fields and audit metadata, and the review table. Existing rows are kept;
legacy zero counts and acceptance fields remain ambiguous. The SQL is not an
idempotent script: inspect the target schema and apply it once to an isolated
database first. It was not applied to the team's database. Coordinate any shared
schema update with the platform owner; do not run seed or reset on a shared DB.

## Checks

Run `npm run test:ai-audit`, `npm run test:studio-input`,
`npm run test:studio-quality`, `npm run test:quiz`, `npm run typecheck`, and
`npm run build`. Tests use mock providers and do not load local API keys.

On 2026-11-10, a real DeepSeek request read a synthetic diagram and generated an
outline. It returned separate token counts for vision and outline; these were
observed in the in-memory audit data. A temporary in-memory PGlite database was
created from the baseline schema, then the generated SQL was applied. Real
Prisma calls saved and read both records and their prompt versions, prevented
publication without confirmation, recorded a reviewer and version after
confirmation, and retained an unattached failed attempt. The actual Studio and
course-editor routes were also requested with an isolated staff session against
that database. The model and stored course in the database test were fixtures;
the shared Neon database was not accessed. PGlite is not a substitute for final
integration testing on the team's PostgreSQL environment.
