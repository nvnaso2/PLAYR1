---
name: Baseline shooting projections
description: Product rule for Day 1 baseline-based shooting forecasts.
---

After a player logs a baseline, the Day 1 chart should start from their measured percentage for each shot type, project gradually diminishing gains over the next year, and scale progress by their stated training frequency. Players with more room below their category ceiling should see more potential improvement; higher starting percentages should have smaller projections. The user considers about 82% to 85% over a year a reasonable 3PT outcome at a few sessions per week, wants daily training from a low baseline to show generous improvement (roughly 60–70% FT), and considers projections above 95% unrealistic for 3PT and mid-range while FT may reach 99%.

The current shooting status should be visually prominent and distinct from a translucent, fluctuating forecast range. Zoom the chart to 5% boundaries around the player’s range, using 5% tick marks when the chart is zoomed in. Avoid presenting trivial 1% annual improvement as a precise outcome.

On the Hub, keep the shooting title and baseline action above a borderless, full-width graph, with the baseline button aligned to the right. Use a data-driven zoom even before a baseline is recorded, framing the default projected series rather than a fixed 20–100% scale. Put the training-frequency and next-session summary below the graph, followed by three vertically stacked, wide shot-type buttons that retain each type's current percentage and annual range.

**Why:** The user requested forecasts that respond to both the player's baseline and planned training frequency rather than showing the same path for everyone, and explicitly rejected a trivial 1% annual projection.

**How to apply:** Recalculate the chart from makes divided by attempts and the player's weekly-equivalent training frequency. Clearly mark the current baseline, show future outcomes as an illustrative range with modest variation, keep plotted data inside the chart, and do not present the result as guaranteed. Preserve the agreed full-width hierarchy, right-align the baseline action, keep the default domain based on plotted data, and keep the session summary and detailed filter buttons below the graph.
