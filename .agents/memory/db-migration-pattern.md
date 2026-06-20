---
name: DB migration pattern
description: How to safely add columns without losing data
---

## Rule
Never run `db:push` — it will drop the leaderboard_challenges and lc_participants tables. Always use direct SQL with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

**Why:** Drizzle's push command in this project does destructive drops on some tables.

**How to apply:** Add column to shared/schema.ts, then run: `node -e "const {Pool}=require('pg'); const pool=new Pool({connectionString:process.env.DATABASE_URL}); pool.query('ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...').then(()=>pool.end())"`
