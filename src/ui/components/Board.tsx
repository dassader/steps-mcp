import { type DragEvent } from "react";

import type { Step, StepStatus } from "../types";
import { boardColumns } from "../utils/status";
import { isStepTransitionAllowed } from "../utils/transitions";
import { BoardColumn } from "./BoardColumn";

interface BoardProps {
  activeDragStatus: StepStatus | null;
  apiError: string | null;
  isFocusedPlanRoute: boolean;
  isLoading: boolean;
  label: string;
  onDrop: (event: DragEvent<HTMLElement>, status: StepStatus) => void;
  onStepClick: (step: Step) => void;
  onStepDragEnd: () => void;
  onStepDragStart: (event: DragEvent<HTMLElement>, stepId: string) => void;
  steps: Step[];
}

export function Board({
  activeDragStatus,
  apiError,
  isFocusedPlanRoute: _isFocusedPlanRoute,
  isLoading,
  label,
  onDrop,
  onStepClick,
  onStepDragEnd,
  onStepDragStart,
  steps
}: BoardProps) {
  return (
    <section className="board" aria-label={label}>
      {apiError ? <div className="api-error">{apiError}</div> : null}
      {boardColumns.map((column) => (
        <BoardColumn
          isDropAllowed={activeDragStatus ? isStepTransitionAllowed(activeDragStatus, column.status) : false}
          isLoading={isLoading}
          key={column.status}
          onDrop={onDrop}
          onStepClick={onStepClick}
          onStepDragEnd={onStepDragEnd}
          onStepDragStart={onStepDragStart}
          status={column.status}
          steps={steps.filter((step) => step.status === column.status)}
          title={column.title}
        />
      ))}
    </section>
  );
}
