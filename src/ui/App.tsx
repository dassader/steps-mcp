import { useState } from "react";

import { PlanBoardPage } from "./pages/PlanBoardPage";
import { PlansPage } from "./pages/PlansPage";

function getPlanIdFromPath(): string | undefined {
  const match = window.location.pathname.match(/^\/plans\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function App() {
  const [focusedPlanId] = useState<string | undefined>(() => getPlanIdFromPath());

  return focusedPlanId ? <PlanBoardPage planId={focusedPlanId} /> : <PlansPage />;
}
