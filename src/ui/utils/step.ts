import type { Plan, Step, StepFormDraft, StepNote } from "../types";

export const visiblePlanLimit = 50;

export function emptyStepDraft(): StepFormDraft {
  return {
    title: "",
    description: ""
  };
}

export function countAttachments(step: Step): number {
  return step.notes.reduce((count, note) => count + note.attachments.length, 0);
}

export function getStandaloneNotes(step: Step): StepNote[] {
  const transitionNoteIds = new Set(step.transitions.map((transition) => transition.noteId));
  return step.notes.filter((note) => !transitionNoteIds.has(note.id));
}

export function countStandaloneNotes(step: Step): number {
  return getStandaloneNotes(step).length;
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
  return `${Math.round(size / 1024 / 102.4) / 10} MB`;
}

export function getLatestPlans(plans: Plan[]): Plan[] {
  return [...plans]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, visiblePlanLimit);
}
