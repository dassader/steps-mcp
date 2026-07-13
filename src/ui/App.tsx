import { useEffect, useState } from "react";

import { PlansPage } from "./pages/PlansPage";

function getPlanIdFromPath(): string | undefined {
  const match = window.location.pathname.match(/^\/plans\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function App() {
  const [routePlanId, setRoutePlanId] = useState<string | undefined>(() => getPlanIdFromPath());

  useEffect(() => {
    function handlePopState(): void {
      setRoutePlanId(getPlanIdFromPath());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function handleSelectedPlanChange(planId: string | undefined): void {
    const nextPath = planId ? `/plans/${encodeURIComponent(planId)}` : "/";
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
    setRoutePlanId(planId);
  }

  return <PlansPage initialSelectedPlanId={routePlanId} onSelectedPlanChange={handleSelectedPlanChange} />;
}
