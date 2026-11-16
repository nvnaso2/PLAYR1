import assert from "node:assert/strict";
import test from "node:test";
import { findRecommendedDrill } from "../client/src/lib/lead-magnet-drill-matching";

test("Game Insights aliases resolve to the exact course drill titles", () => {
  const catalog = [
    { id: "one-hand", title: "Form Shots — 1 Handed" },
    { id: "penny", title: "Form Shots — Penny" },
  ];

  assert.equal(findRecommendedDrill("1 Hand Form Shooting", catalog)?.id, "one-hand");
  assert.equal(findRecommendedDrill("Penny Form Shots", catalog)?.id, "penny");
});

test("recommendations do not use a partial title match", () => {
  const catalog = [{ id: "form", title: "Form Shots" }];

  assert.equal(findRecommendedDrill("Form Shooting", catalog), undefined);
});
