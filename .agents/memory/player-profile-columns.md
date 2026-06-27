---
name: Player profile DB column additions
description: How to safely add columns to player_profiles without triggering Drizzle's interactive prompt
---

# Rule
Use `ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS ...` via direct psql/SQL, NOT `drizzle-kit push`.

**Why:** The `player_profiles` table has a unique constraint `streak_challenges_slug_unique` that causes `drizzle-kit push` to prompt interactively ("Are you sure you want to drop..."), which blocks non-interactive CI/agent runs.

**How to apply:** Whenever new columns are needed on `player_profiles`, add them to `shared/schema.ts` AND run the SQL migration directly in the same task. Pattern:
```sql
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS <col> <type> DEFAULT <val>;
```
