import assert from "node:assert/strict";
import test from "node:test";
import { drillDiagramSchema } from "../shared/schema";

test("drill diagram validation preserves all movement arrow coordinates", () => {
  const arrow = {
    id: "arrow-1",
    type: "arrow" as const,
    x: 50,
    y: 68,
    angle: 0,
    scale: 1,
    startX: 31,
    startY: 72,
    controlX: 46,
    controlY: 50,
    endX: 63,
    endY: 29,
  };

  const result = drillDiagramSchema.parse({ version: 1, elements: [arrow] });

  assert.deepEqual(result.elements[0], arrow);
});

test("drill diagram validation fills default movement arrow coordinates", () => {
  const result = drillDiagramSchema.parse({
    version: 1,
    elements: [{ id: "arrow-2", type: "arrow", x: 50, y: 68 }],
  });

  assert.deepEqual(result.elements[0], {
    id: "arrow-2",
    type: "arrow",
    x: 50,
    y: 68,
    startX: 45,
    startY: 63,
    controlX: 50,
    controlY: 66,
    endX: 55,
    endY: 74,
  });
});
