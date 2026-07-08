import { Check, Clock, Copy, Plus } from "lucide-react";

import type { Plan } from "../types";
import { formatDate } from "../utils/date";
import { formatStatus } from "../utils/status";

interface PlanRailProps {
  onCopyPlanId: (planId: string) => void;
  onCreatePlan: () => void;
  onSelectPlan: (planId: string) => void;
  plans: Plan[];
  selectedPlanId?: string;
}

export function PlanRail({ onCopyPlanId, onCreatePlan, onSelectPlan, plans, selectedPlanId }: PlanRailProps) {
  return (
    <aside className="plans-rail" aria-label="Plans">
      <button className="plan-card plan-create-card" onClick={onCreatePlan} type="button">
        <span className="plan-create-icon">
          <Plus aria-hidden="true" size={18} />
        </span>
        <span className="plan-name">Create plan</span>
      </button>
      {plans.map((plan) => (
        <article className={`plan-card plan-card-shell ${plan.id === selectedPlanId ? "is-selected" : ""}`} key={plan.id}>
          <button className="plan-card-select" onClick={() => onSelectPlan(plan.id)} type="button">
            <span className="plan-name">{plan.title}</span>
            <span className={`plan-status status-${plan.status}`}>{formatStatus(plan.status)}</span>
            <span className="plan-meta">
              <Clock aria-hidden="true" size={14} />
              {formatDate(plan.createdAt)}
            </span>
            <span className="plan-progress">
              <Check aria-hidden="true" size={14} />
              {plan.stepCounts.done}/{plan.stepCounts.total}
            </span>
          </button>
          <button
            className="plan-copy-button"
            onClick={(event) => {
              if (event.currentTarget.dataset.pointerCopy === "true") {
                delete event.currentTarget.dataset.pointerCopy;
                return;
              }
              onCopyPlanId(plan.id);
            }}
            onPointerDown={(event) => {
              if (event.button !== 0) {
                return;
              }
              event.currentTarget.dataset.pointerCopy = "true";
              onCopyPlanId(plan.id);
            }}
            type="button"
          >
            <Copy aria-hidden="true" size={13} />
            Copy ID
          </button>
        </article>
      ))}
    </aside>
  );
}
