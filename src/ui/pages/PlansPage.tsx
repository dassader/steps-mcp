import { Check, Plus } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { ApprovePlanModal } from "../components/ApprovePlanModal";
import { Board } from "../components/Board";
import { CreatePlanModal } from "../components/CreatePlanModal";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { MoveStepModal } from "../components/MoveStepModal";
import { PlanRail } from "../components/PlanRail";
import { StepFormModal } from "../components/StepFormModal";
import { ToastStack, type ToastState } from "../components/ToastStack";
import { useDragDropHandlers } from "../hooks/useDragDropHandlers";
import { useModal } from "../hooks/useModal";
import { usePlanBoard } from "../hooks/usePlanBoard";
import { usePlans } from "../hooks/usePlans";
import type { ApproveIntent, MoveDraft, Step, StepFormDraft } from "../types";
import { isEditableKeyboardTarget } from "../utils/keyboard";
import { emptyStepDraft } from "../utils/step";
import { isStepTransitionAllowed, unavailableTransitionMessage } from "../utils/transitions";

const TOAST_DURATION_MS = 4200;

async function writeTextToClipboard(text: string): Promise<void> {
  if (copyTextWithCopyEvent(text) || copyTextWithTextArea(text)) {
    return;
  }

  const clipboard = globalThis.navigator?.clipboard;
  if (clipboard?.writeText) {
    await clipboard.writeText(text);
    return;
  }

  throw new Error("Clipboard copy failed.");
}

function copyTextWithCopyEvent(text: string): boolean {
  let eventCopySucceeded = false;
  function handleCopy(event: ClipboardEvent): void {
    event.clipboardData?.setData("text/plain", text);
    event.preventDefault();
    eventCopySucceeded = true;
  }

  document.addEventListener("copy", handleCopy);
  const eventCopyWasTriggered = document.execCommand("copy");
  document.removeEventListener("copy", handleCopy);
  return eventCopyWasTriggered && eventCopySucceeded;
}

function copyTextWithTextArea(text: string): boolean {
  const textArea = document.createElement("textarea");
  try {
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "0";
    textArea.style.top = "0";
    textArea.style.width = "1px";
    textArea.style.height = "1px";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";
    document.body.append(textArea);
    if (typeof globalThis.focus === "function") {
      globalThis.focus();
    }
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    return document.execCommand("copy");
  } finally {
    textArea.remove();
  }
}

export function PlansPage() {
  const {
    apiError: plansError,
    createNewPlan,
    isLoading: isPlansLoading,
    refreshPlans,
    selectPlan,
    selectedPlan,
    selectedPlanId,
    visiblePlans
  } = usePlans({
    enabled: true
  });

  const boardPlanId = selectedPlanId;
  const {
    apiError: boardError,
    approveBoardPlan,
    createBoardStep,
    deleteBoardStep,
    isLoading: isBoardLoading,
    planState,
    setApiError: setBoardApiError,
    steps: selectedPlanSteps,
    transitionBoardStep,
    updateBoardStep
  } = usePlanBoard(boardPlanId);

  const [createPlanTitle, setCreatePlanTitle] = useState<string | null>(null);
  const [createPlanError, setCreatePlanError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const { value: approveIntent, open: setApproveIntent, close: closeApproveIntent } = useModal<ApproveIntent>();
  const { value: moveDraft, open: setMoveDraft, close: closeMoveDraft } = useModal<MoveDraft>();
  const { value: stepDraft, setValue: setStepDraft, close: closeStepDraft } = useModal<StepFormDraft>();
  const { value: deleteStepId, open: setDeleteStepId, close: closeDeleteStep } = useModal<string>();
  const addStepButtonRef = useRef<HTMLButtonElement>(null);
  const apiError = plansError ?? boardError;
  const isLoading = isPlansLoading || isBoardLoading;
  const stepDetails = stepDraft?.id ? selectedPlanSteps.find((step) => step.id === stepDraft.id) ?? null : null;
  const activePlanId = planState?.plan.id ?? selectedPlanId;
  const boardLabel = planState?.plan.title ?? selectedPlan?.title ?? "Steps";
  const canApprovePlan = Boolean(activePlanId) && planState?.plan.status === "draft";

  const { draggedStep, handleDragEnd, handleDragStart, handleDrop, shouldSuppressClick } = useDragDropHandlers({
    onMoveRequested: requestMove,
    steps: selectedPlanSteps
  });

  async function refreshPlanList(): Promise<void> {
    await refreshPlans();
  }

  function pushToast(message: string, kind: ToastState["kind"] = "success"): void {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((currentToasts) => [{ id, kind, message }, ...currentToasts].slice(0, 5));
    window.setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
    }, TOAST_DURATION_MS);
  }

  function openCreatePlan(): void {
    setCreatePlanError(null);
    setCreatePlanTitle("");
  }

  function closeCreatePlan(): void {
    setCreatePlanError(null);
    setCreatePlanTitle(null);
  }

  async function createPlanFromModal(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const title = createPlanTitle?.trim();
    if (!title) {
      return;
    }

    try {
      setCreatePlanError(null);
      setBoardApiError(null);
      await createNewPlan(title);
      closeCreatePlan();
    } catch (error) {
      setCreatePlanError(error instanceof Error ? error.message : "Failed to create plan.");
    }
  }

  async function copyPlanIdToClipboard(planId: string): Promise<void> {
    try {
      await writeTextToClipboard(planId);
      pushToast("Plan ID copied to clipboard.");
    } catch {
      pushToast("Failed to copy Plan ID.", "error");
    }
  }

  function requestMove(draft: MoveDraft): void {
    const step = selectedPlanSteps.find((candidate) => candidate.id === draft.stepId);
    if (!step) {
      return;
    }
    if (!isStepTransitionAllowed(step.status, draft.nextStatus)) {
      setBoardApiError(unavailableTransitionMessage(step.status, draft.nextStatus));
      return;
    }

    setBoardApiError(null);
    if (planState?.plan.status === "draft") {
      setApproveIntent({ kind: "move", moveDraft: draft });
      return;
    }

    setMoveDraft(draft);
  }

  async function approveCurrentPlan(): Promise<void> {
    if (!activePlanId || !approveIntent) {
      return;
    }

    try {
      setBoardApiError(null);
      await approveBoardPlan(activePlanId);
      closeApproveIntent();
      await refreshPlanList();
      if (approveIntent.kind === "move") {
        setMoveDraft(approveIntent.moveDraft);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to approve plan.";
      setBoardApiError(message);
      pushToast(message, "error");
    }
  }

  async function confirmMove(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!moveDraft || moveDraft.note.trim().length === 0) {
      return;
    }

    try {
      setBoardApiError(null);
      await transitionBoardStep(moveDraft.stepId, {
        toStatus: moveDraft.nextStatus,
        noteText: moveDraft.note.trim()
      });
      closeMoveDraft();
      await refreshPlanList();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to move step.";
      setBoardApiError(message);
      pushToast(message, "error");
    }
  }

  function openCreateStep(): void {
    setStepDraft(emptyStepDraft());
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (
        !selectedPlanId ||
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLocaleLowerCase() !== "n" ||
        isEditableKeyboardTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      openCreateStep();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPlanId]);

  function openApprovePlan(): void {
    if (activePlanId) {
      setApproveIntent({ kind: "manual" });
    }
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
    if (!stepDraft || !activePlanId || stepDraft.title.trim().length === 0) {
      return;
    }

    const title = stepDraft.title.trim();
    const description = stepDraft.description.trim();

    try {
      setBoardApiError(null);
      if (stepDraft.id) {
        await updateBoardStep(stepDraft.id, { title, description });
      } else {
        await createBoardStep(activePlanId, { title, description });
      }
      closeStepDraft();
      await refreshPlanList();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save step.";
      setBoardApiError(message);
      pushToast(message, "error");
    }
  }

  async function deleteStep(): Promise<void> {
    if (!deleteStepId) {
      return;
    }

    try {
      setBoardApiError(null);
      await deleteBoardStep(deleteStepId);
      closeDeleteStep();
      closeStepDraft();
      await refreshPlanList();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete step.";
      setBoardApiError(message);
      pushToast(message, "error");
    }
  }

  return (
    <main className="app-shell">
      <PlanRail
        onCopyPlanId={copyPlanIdToClipboard}
        onCreatePlan={openCreatePlan}
        onSelectPlan={selectPlan}
        plans={visiblePlans}
        selectedPlanId={selectedPlanId}
      />

      {selectedPlanId ? (
        <>
          <Board
            activeDragStatus={draggedStep?.status ?? null}
            apiError={apiError}
            isFocusedPlanRoute={false}
            isLoading={isLoading}
            label={boardLabel}
            onDrop={handleDrop}
            onStepClick={openEditStep}
            onStepDragEnd={handleDragEnd}
            onStepDragStart={handleDragStart}
            steps={selectedPlanSteps}
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
        </>
      ) : null}

      {createPlanTitle !== null ? (
        <CreatePlanModal
          error={createPlanError}
          onChange={setCreatePlanTitle}
          onClose={closeCreatePlan}
          onSubmit={createPlanFromModal}
          title={createPlanTitle}
        />
      ) : null}

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
