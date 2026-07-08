import { type DragEvent, useRef, useState } from "react";

import type { MoveDraft, Step, StepStatus } from "../types";

interface UseDragDropHandlersOptions {
  onMoveRequested: (draft: MoveDraft) => void;
  steps: Step[];
}

const suppressClickDelayMs = 250;

export function useDragDropHandlers({ onMoveRequested, steps }: UseDragDropHandlersOptions) {
  const draggedStepId = useRef<string | null>(null);
  const suppressClickUntil = useRef(0);
  const [activeDraggedStepId, setActiveDraggedStepId] = useState<string | null>(null);
  const draggedStep = steps.find((step) => step.id === activeDraggedStepId) ?? null;

  function handleDragStart(event: DragEvent<HTMLElement>, stepId: string): void {
    draggedStepId.current = stepId;
    setActiveDraggedStepId(stepId);
    suppressClickUntil.current = Date.now() + suppressClickDelayMs;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", stepId);
  }

  function handleDragEnd(): void {
    draggedStepId.current = null;
    setActiveDraggedStepId(null);
  }

  function handleDrop(event: DragEvent<HTMLElement>, nextStatus: StepStatus): void {
    event.preventDefault();
    const stepId = draggedStepId.current ?? event.dataTransfer.getData("text/plain");
    const step = steps.find((candidate) => candidate.id === stepId);

    draggedStepId.current = null;
    setActiveDraggedStepId(null);
    suppressClickUntil.current = Date.now() + suppressClickDelayMs;

    if (!step || step.status === nextStatus) {
      return;
    }

    onMoveRequested({
      stepId: step.id,
      nextStatus,
      note: ""
    });
  }

  function shouldSuppressClick(): boolean {
    return Date.now() < suppressClickUntil.current;
  }

  return {
    draggedStep,
    handleDragEnd,
    handleDragStart,
    handleDrop,
    shouldSuppressClick
  };
}
