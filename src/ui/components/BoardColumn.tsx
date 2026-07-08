import { type DragEvent } from "react";

import type { Step, StepStatus } from "../types";
import { StepCard } from "./StepCard";

interface BoardColumnProps {
  isDropAllowed: boolean;
  isLoading: boolean;
  onDrop: (event: DragEvent<HTMLElement>, status: StepStatus) => void;
  onStepClick: (step: Step) => void;
  onStepDragEnd: () => void;
  onStepDragStart: (event: DragEvent<HTMLElement>, stepId: string) => void;
  steps: Step[];
  status: StepStatus;
  title: string;
}

export function BoardColumn({
  isDropAllowed,
  isLoading,
  onDrop,
  onStepClick,
  onStepDragEnd,
  onStepDragStart,
  steps,
  status,
  title
}: BoardColumnProps) {
  function handleDragOver(event: DragEvent<HTMLElement>): void {
    event.preventDefault();
    event.dataTransfer.dropEffect = isDropAllowed ? "move" : "none";
  }

  return (
    <section
      className={`board-column ${isDropAllowed ? "is-drop-allowed" : ""}`}
      onDragOver={handleDragOver}
      onDrop={(event) => onDrop(event, status)}
    >
      <div className="column-title">
        <span>{title}</span>
        <span>{isLoading ? "" : steps.length}</span>
      </div>
      <div className="step-stack">
        {isLoading
          ? Array.from({ length: 3 }, (_, index) => (
              <div className="step-card step-card-skeleton" key={index} aria-hidden="true">
                <span className="skeleton-line skeleton-title" />
                <span className="skeleton-line skeleton-copy" />
                <span className="skeleton-line skeleton-copy-short" />
                <span className="skeleton-line skeleton-meta" />
              </div>
            ))
          : steps.map((step) => (
              <StepCard key={step.id} onClick={onStepClick} onDragEnd={onStepDragEnd} onDragStart={onStepDragStart} step={step} />
            ))}
        {!isLoading && steps.length === 0 ? <div className="step-stack-empty">No steps</div> : null}
      </div>
    </section>
  );
}
