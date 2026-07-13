import { useEffect, useMemo, useState } from "react";

import { createPlan, listPlans } from "../mcpApi";
import type { Plan } from "../types";
import { getLatestPlans } from "../utils/step";

interface UsePlansOptions {
  enabled: boolean;
  initialSelectedPlanId?: string;
}

export function usePlans({ enabled, initialSelectedPlanId }: UsePlansOptions) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(() => initialSelectedPlanId);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);

  const visiblePlans = useMemo(() => getLatestPlans(plans), [plans]);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);

  async function refreshPlans(signal?: AbortSignal): Promise<Plan[]> {
    if (!enabled) {
      return [];
    }

    const nextPlans = await listPlans({ signal });
    setPlans(nextPlans);
    return nextPlans;
  }

  function selectPlan(planId: string): void {
    setSelectedPlanId(planId);
    setApiError(null);
  }

  async function createNewPlan(title: string): Promise<Plan> {
    const created = await createPlan({ title });
    const nextPlans = await refreshPlans();
    setSelectedPlanId(created.id);
    setPlans((currentPlans) => (nextPlans.length > 0 ? nextPlans : [created, ...currentPlans]));
    setApiError(null);
    return created;
  }

  useEffect(() => {
    setSelectedPlanId(initialSelectedPlanId);
    setApiError(null);
  }, [initialSelectedPlanId]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();

    async function load(): Promise<void> {
      try {
        setIsLoading(true);
        setApiError(null);
        const nextPlans = await listPlans({ signal: abortController.signal });
        if (abortController.signal.aborted) return;

        setPlans(nextPlans);
      } catch (error) {
        if (!abortController.signal.aborted) setApiError(error instanceof Error ? error.message : "Failed to load plans.");
      } finally {
        if (!abortController.signal.aborted) setIsLoading(false);
      }
    }

    void load();

    return () => {
      abortController.abort();
    };
  }, [enabled]);

  return {
    apiError,
    isLoading,
    plans,
    createNewPlan,
    refreshPlans,
    selectPlan,
    selectedPlan,
    selectedPlanId,
    setApiError,
    setSelectedPlanId,
    visiblePlans
  };
}
