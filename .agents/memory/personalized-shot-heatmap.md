---
name: Personalized shot heat map
description: Product intent for grading Dashboard shot zones against an individual player's recent performance
---

Dashboard shot-zone colors should compare each player with their own recent average for that shot type, not against shared absolute percentage thresholds. Use a smooth red-to-gold-to-light-green-to-deeper-green gradient, with the player's average at a soft yellow-green and percentage labels spanning 0–100%; keep actual makes, attempts, and percentages visible, and don't add separate baseline summary cards. Color communicates personal-relative performance, not a cross-player ranking. The requested reference window is up to ten recent workouts with attempts in each shot type.

**Why:** The user wants a beginner's typical 20% three-point rate and an experienced player's typical 80% rate to be treated as their respective averages rather than receiving different fixed-grade colors. They also prefer a continuous shaded gradient, with the average in light green and yellow reserved for below-average performance.

**How to apply:** Preserve separate recent baselines for three-pointers, mid-range, free throws, and layups. Keep numerical performance factual and use the color scale only for comparison against the player's own baseline; interpolate shades continuously and don't return to an orange midpoint or a ±25-point legend.
