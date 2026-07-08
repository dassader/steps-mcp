import type { SqliteDatabase } from "../../db/connection.js";
import type { Transition } from "../../domain/types.js";
import { findTransitionsByStepId } from "../../repositories/transition.repository.js";
import { noteUri, stepTransitionsUri, stepUri } from "../uris.js";
import type { StepTransitionsView, TransitionView } from "../views.js";
import { requireStep } from "./step-utils.js";

export function readStepTransitions(db: SqliteDatabase, stepId: string): StepTransitionsView {
  const step = requireStep(db, stepId);
  return {
    resourceType: "step_transitions",
    uri: stepTransitionsUri(step.id),
    stepId: step.id,
    stepUri: stepUri(step.id),
    transitions: findTransitionsByStepId(db, step.id).map(toTransitionView)
  };
}

function toTransitionView(transition: Transition): TransitionView {
  return {
    id: transition.id,
    fromStatus: transition.fromStatus,
    toStatus: transition.toStatus,
    noteId: transition.noteId,
    noteUri: noteUri(transition.noteId),
    createdAt: transition.createdAt
  };
}
