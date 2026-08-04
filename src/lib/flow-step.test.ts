import { describe, expect, it } from "vitest";
import { routeToStep, stepToRoute, type FlowStep } from "./flow-step";

describe("stepToRoute", () => {
  it("maps question step to /ask route", () => {
    expect(stepToRoute("question", "p1")).toBe("/ask/p1");
  });

  it("maps prd step to /prd route", () => {
    expect(stepToRoute("prd", "p1")).toBe("/prd/p1");
  });

  it("maps ac step to /ac route", () => {
    expect(stepToRoute("ac", "p1")).toBe("/ac/p1");
  });

  it("maps task step to /task route", () => {
    expect(stepToRoute("task", "p1")).toBe("/task/p1");
  });

  it("defaults unknown/null step to /prd route", () => {
    // ponytail: defensive - DB step could be null/legacy. /prd is the landing.
    expect(stepToRoute(undefined, "p1")).toBe("/prd/p1");
    expect(stepToRoute(null, "p1")).toBe("/prd/p1");
    expect(stepToRoute("unknown" as never, "p1")).toBe("/prd/p1");
  });
});

describe("routeToStep", () => {
  it("detects ask as question", () => {
    expect(routeToStep("/ask/x")).toBe("question");
    expect(routeToStep("/ask")).toBe("question");
  });

  it("detects ac", () => {
    expect(routeToStep("/ac/x")).toBe("ac");
  });

  it("detects task and kanban as task", () => {
    expect(routeToStep("/task/x")).toBe("task");
    expect(routeToStep("/kanban/x")).toBe("task");
  });

  it("defaults to prd", () => {
    expect(routeToStep("/")).toBe("prd");
    expect(routeToStep("/pricing")).toBe("prd");
  });
});

describe("round-trip", () => {
  it("stepToRoute is the inverse of routeToStep for every flow step", () => {
    const routes = ["/ask/x", "/prd/x", "/ac/x", "/task/x"];
    for (const r of routes) {
      expect(stepToRoute(routeToStep(r), "x")).toBe(r);
    }
  });

  it("FlowStep covers exactly question|prd|ac|task", () => {
    const steps: FlowStep[] = ["question", "prd", "ac", "task"];
    expect(steps).toHaveLength(4);
  });
});
