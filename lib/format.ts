import type { ActivityFormat, CourseStatus } from "./types";

/** Presentation helpers shared by the editor and the course list. */

const FORMAT_LABEL: Record<ActivityFormat, string> = {
  reading: "Reading",
  simulation: "Simulation",
  code_lab: "Code lab",
  role_play: "Role play",
  quiz: "Quiz",
  game: "Mini-game",
  narrated_slides: "Narrated slides",
  peer_review: "Peer review",
};

const FORMAT_PILL: Record<ActivityFormat, string> = {
  reading: "pill pill-line",
  simulation: "pill pill-brand",
  code_lab: "pill pill-teal",
  role_play: "pill pill-amber",
  quiz: "pill",
  game: "pill pill-brand",
  narrated_slides: "pill pill-line",
  peer_review: "pill pill-amber",
};

export const FORMATS: ActivityFormat[] = [
  "reading",
  "simulation",
  "code_lab",
  "role_play",
  "quiz",
  "game",
  "narrated_slides",
  "peer_review",
];

export function formatLabel(format: ActivityFormat): string {
  return FORMAT_LABEL[format] ?? "Activity";
}

export function formatPill(format: ActivityFormat): string {
  return FORMAT_PILL[format] ?? "pill";
}

const STATUS_LABEL: Record<CourseStatus, string> = {
  draft: "Draft",
  review: "In review",
  published: "Published",
};

const STATUS_PILL: Record<CourseStatus, string> = {
  draft: "pill",
  review: "pill pill-amber",
  published: "pill pill-teal",
};

export function statusLabel(status: CourseStatus): string {
  return STATUS_LABEL[status];
}

export function statusPill(status: CourseStatus): string {
  return STATUS_PILL[status];
}

export function audienceLabel(audience: "cs" | "non_cs" | "mixed"): string {
  return audience === "mixed" ? "Mixed cohort" : audience === "cs" ? "CS graduates" : "Non-CS majors";
}
