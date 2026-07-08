import { Check, Plus } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { ApprovePlanModal } from "../components/ApprovePlanModal";
import { Board } from "../components/Board";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { MoveStepModal } from "../components/MoveStepModal";
import { StepFormModal } from "../components/StepFormModal";
import { ToastStack, type ToastState } from "../components/ToastStack";
import { useDragDropHandlers } from "../hooks/useDragDropHandlers";
import { useModal } from "../hooks/useModal";
import { usePlanBoard } from "../hooks/usePlanBoard";
import type { ApproveIntent, MoveDraft, Step, StepFormDraft } from "../types";
import { isEditableKeyboardTarget } from "../utils/keyboard";
import { emptyStepDraft } from "../utils/step";
import { isStepTransitionAllowed, unavailableTransitionMessage } from "../utils/transitions";

interface PlanBoardPageProps {
  planId: string;
}

const TOAST_DURATION_MS = 4200;

export function PlanBoardPage({ planId }: PlanBoardPageProps) {
  const {
    apiError,
    approveBoardPlan,
    createBoardStep,
    deleteBoardStep,
    isLoading,
    planState,
    setApiError,
    steps,
    transitionBoardStep,
    updateBoardStep
  } = usePlanBoard(planId);

  const { value: approveIntent, open: setApproveIntent, close: closeApproveIntent } = useModal<ApproveIntent>();
  const { value: moveDraft, open: setMoveDraft, close: closeMoveDraft } = useModal<MoveDraft>();
  const { value: stepDraft, setValue: setStepDraft, close: closeStepDraft } = useModal<StepFormDraft>();
  const { value: deleteStepId, open: setDeleteStepId, close: closeDeleteStep } = useModal<string>();
  const addStepButtonRef = useRef<HTMLButtonElement>(null);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const stepDetails = stepDraft?.id ? steps.find((step) => step.id === stepDraft.id) ?? null : null;
  const boardLabel = planState?.plan.title ?? "Steps";
  const canApprovePlan = planState?.plan.status === "draft";

  const { draggedStep, handleDragEnd, handleDragStart, handleDrop, shouldSuppressClick } = useDragDropHandlers({
    onMoveRequested: requestMove,
    steps
  });

  function requestMove(draft: MoveDraft): void {
    const step = steps.find((candidate) => candidate.id === draft.stepId);
    if (!step) {
      return;
    }
    if (!isStepTransitionAllowed(step.status, draft.nextStatus)) {
      setApiError(unavailableTransitionMessage(step.status, draft.nextStatus));
      return;
    }

    setApiError(null);
    if (planState?.plan.status === "draft") {
      setApproveIntent({ kind: "move", moveDraft: draft });
      return;
    }

    setMoveDraft(draft);
  }

  function pushToast(message: string, kind: ToastState["kind"] = "success"): void {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((currentToasts) => [{ id, kind, message }, ...currentToasts].slice(0, 5));
    window.setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
    }, TOAST_DURATION_MS);
  }

  async function approveCurrentPlan(): Promise<void> {
    if (!approveIntent) {
      return;
    }

    try {
      setApiError(null);
      await approveBoardPlan(planId);
      closeApproveIntent();
      if (approveIntent.kind === "move") {
        setMoveDraft(approveIntent.moveDraft);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to approve plan.";
      setApiError(message);
      pushToast(message, "error");
    }
  }

  async function confirmMove(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!moveDraft || moveDraft.note.trim().length === 0) {
      return;
    }

    try {
      setApiError(null);
      await transitionBoardStep(moveDraft.stepId, {
        toStatus: moveDraft.nextStatus,
        noteText: moveDraft.note.trim()
      });
      closeMoveDraft();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to move step.";
      setApiError(message);
      pushToast(message, "error");
    }
  }

  function openCreateStep(): void {
    setStepDraft(emptyStepDraft());
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLocaleLowerCase() !== "n" || isEditableKeyboardTarget(event.target)) {
        return;
      }

      event.preventDefault();
      openCreateStep();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function openApprovePlan(): void {
    setApproveIntent({ kind: "manual" });
  }

  function openEditStep(step: Step): void {
    if (shouldSuppressClick()) {
      return;
    }

    setStepDraft({
      id: step.id,
      title: step.title,
      description: step.description
    });
  }

  async function saveStep(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!stepDraft || stepDraft.title.trim().length === 0) {
      return;
    }

    const title = stepDraft.title.trim();
    const description = stepDraft.description.trim();

    try {
      setApiError(null);
      if (stepDraft.id) {
        await updateBoardStep(stepDraft.id, { title, description });
      } else {
        await createBoardStep(planId, { title, description });
      }
      closeStepDraft();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save step.";
      setApiError(message);
      pushToast(message, "error");
    }
  }

  async function deleteStep(): Promise<void> {
    if (!deleteStepId) {
      return;
    }

    try {
      setApiError(null);
      await deleteBoardStep(deleteStepId);
      closeDeleteStep();
      closeStepDraft();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete step.";
      setApiError(message);
      pushToast(message, "error");
    }
  }

  return (
    <main className="app-shell app-shell-focused">
      <Board
        activeDragStatus={draggedStep?.status ?? null}
        apiError={apiError}
        isFocusedPlanRoute
        isLoading={isLoading}
        label={boardLabel}
        onDrop={handleDrop}
        onStepClick={openEditStep}
        onStepDragEnd={handleDragEnd}
        onStepDragStart={handleDragStart}
        steps={steps}
      />

      <div className="fab-stack">
        {canApprovePlan ? (
          <button
            aria-label="Approve plan"
            className="fab fab-approve"
            onClick={openApprovePlan}
            onMouseDown={(event) => event.currentTarget.focus()}
            type="button"
          >
            <Check aria-hidden="true" size={25} />
          </button>
        ) : null}
        <button
          aria-keyshortcuts="Control+N Meta+N"
          aria-label="Add step"
          className="fab"
          onClick={openCreateStep}
          onMouseDown={(event) => event.currentTarget.focus()}
          ref={addStepButtonRef}
          title="Add step (Ctrl+N)"
          type="button"
        >
          <Plus aria-hidden="true" size={26} />
        </button>
      </div>

      {approveIntent ? (
        <ApprovePlanModal
          message={
            approveIntent.kind === "move"
              ? "This plan has not been approved yet. Approve it before moving this step?"
              : "This plan will become available for execution."
          }
          onClose={closeApproveIntent}
          onConfirm={approveCurrentPlan}
        />
      ) : null}

      {moveDraft ? <MoveStepModal moveDraft={moveDraft} onChange={setMoveDraft} onClose={closeMoveDraft} onSubmit={confirmMove} /> : null}

      {stepDraft ? (
        <StepFormModal
          onChange={setStepDraft}
          onClose={closeStepDraft}
          onDelete={setDeleteStepId}
          onSubmit={saveStep}
          restoreFocusTo={stepDraft.id ? null : addStepButtonRef.current}
          stepDetails={stepDetails}
          stepDraft={stepDraft}
        />
      ) : null}

      {deleteStepId ? <DeleteConfirmModal onClose={closeDeleteStep} onConfirm={deleteStep} /> : null}

      <ToastStack toasts={toasts} />
    </main>
  );
}
