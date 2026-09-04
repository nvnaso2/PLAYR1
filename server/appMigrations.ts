import { pool } from "./db";

// Application schema migrations run separately from stripe-replit-sync,
// which intentionally owns only its private `stripe` schema.
export async function runApplicationMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('playr1-application-migrations'))");
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan varchar DEFAULT 'free';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status varchar DEFAULT 'free';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_price_interval varchar;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamp;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean DEFAULT false;
      ALTER TABLE programs ADD COLUMN IF NOT EXISTS trailer_video_url varchar;
      ALTER TABLE programs ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
      ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS school_name varchar;
      CREATE TABLE IF NOT EXISTS coach_p_usage (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL,
        month_key varchar NOT NULL,
        question_count integer NOT NULL DEFAULT 0,
        updated_at timestamp DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS coach_p_usage_user_month_uq
        ON coach_p_usage (user_id, month_key);
    `);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}