import { type DragEvent } from "react";

import type { Step } from "../types";
import { countAttachments, countStandaloneNotes } from "../utils/step";

interface StepCardProps {
  onClick: (step: Step) => void;
  onDragEnd: () => void;
  onDragStart: (event: DragEvent<HTMLElement>, stepId: string) => void;
  step: Step;
}

export function StepCard({ onClick, onDragEnd, onDragStart, step }: StepCardProps) {
  const attachmentCount = countAttachments(step);
  const noteCount = countStandaloneNotes(step);

  return (
    <button
      className="step-card"
      draggable
      onClick={() => onClick(step)}
      onDragEnd={onDragEnd}
      onDragStart={(event) => onDragStart(event, step.id)}
      type="button"
    >
      <span className="step-title">{step.title}</span>
      <span className="step-description">{step.description}</span>
      <span className="step-card-meta">
        {noteCount > 0 ? <span>{noteCount} notes</span> : null}
        {attachmentCount > 0 ? <span>{attachmentCount} files</span> : null}
        {step.transitions.length > 0 ? <span>{step.transitions.length} moves</span> : null}
      </span>
    </button>
  );
}
