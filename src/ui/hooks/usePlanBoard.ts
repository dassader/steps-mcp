import { useEffect, useState } from "react";

import { approvePlan, createStep, deleteStep as deleteStepRequest, getPlanState, transitionStep, updateStep } from "../mcpApi";
import type { PlanState, StepStatus } from "../types";

interface StepInput {
  title: string;
  description: string;
}

export function usePlanBoard(planId: string | undefined) {
  const [planState, setPlanState] = useState<PlanState | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(planId !== undefined);

  const steps = planState && planState.plan.id === planId ? planState.steps : [];

  async function refreshPlanState(nextPlanId = planId, signal?: AbortSignal): Promise<PlanState | null> {
    if (!nextPlanId) {
      setPlanState(null);
      return null;
    }

    const nextState = await getPlanState(nextPlanId, { signal });
    setPlanState(nextState);
    return nextState;
  }

  async function createBoardStep(targetPlanId: string, input: StepInput): Promise<void> {
    await createStep(targetPlanId, input);
    await refreshPlanState(targetPlanId);
  }

  async function approveBoardPlan(targetPlanId = planId): Promise<void> {
    if (!targetPlanId) {
      return;
    }
    const nextState = await approvePlan(targetPlanId);
    setPlanState(nextState);
  }

  async function updateBoardStep(stepId: string, input: StepInput): Promise<void> {
    await updateStep(stepId, input);
    await refreshPlanState();
  }

  async function deleteBoardStep(stepId: string): Promise<void> {
    await deleteStepRequest(stepId);
    await refreshPlanState();
  }

  async function transitionBoardStep(stepId: string, input: { toStatus: StepStatus; noteText: string }): Promise<void> {
    await transitionStep(stepId, input);
    await refreshPlanState();
  }

  useEffect(() => {
    const abortController = new AbortController();

    async function load(): Promise<void> {
      if (!planId) {
        setPlanState(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setApiError(null);
        const nextState = await getPlanState(planId, { signal: abortController.signal });
        if (!abortController.signal.aborted) setPlanState(nextState);
      } catch (error) {
        if (!abortController.signal.aborted) setApiError(error instanceof Error ? error.message : "Failed to load plan.");
      } finally {
        if (!abortController.signal.aborted) setIsLoading(false);
      }
    }

    void load();

    return () => {
      abortController.abort();
    };
  }, [planId]);

  return {
    apiError,
    approveBoardPlan,
    createBoardStep,
    deleteBoardStep,
    isLoading,
    planState,
    refreshPlanState,
    setApiError,
    steps,
    transitionBoardStep,
    updateBoardStep
  };
}
