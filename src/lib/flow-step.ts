// ponytail: pure step<->route mapping, no client deps. Lives outside the
// "use client" flow-step-nav.tsx so tests + server code can import it without
// dragging next/navigation (→ Buffer) into their graph.

export type FlowStep = "question" | "prd" | "ac" | "task";

export function routeToStep(pathname: string): FlowStep {
  if (pathname.startsWith("/ask/") || pathname === "/ask") return "question";
  if (pathname.startsWith("/ac/") || pathname === "/ac") return "ac";
  if (pathname.startsWith("/task/") || pathname === "/task") return "task";
  if (pathname.startsWith("/kanban/") || pathname === "/kanban") return "task";
  return "prd";
}

// Map a project's persisted DB step to the route that resumes its furthest
// progress. Used by History cards. /prd is the safe landing for null/legacy
// steps - the PRD chat regenerates or restores from prdVersions.
export function stepToRoute(step: string | null | undefined, projectId: string): string {
  switch (step) {
    case "question":
      return `/ask/${projectId}`;
    case "ac":
      return `/ac/${projectId}`;
    case "task":
      return `/task/${projectId}`;
    case "prd":
    default:
      return `/prd/${projectId}`;
  }
}
