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
      ALTER TABLE workout_drills ADD COLUMN IF NOT EXISTS coaching_notes text;
      ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS school_name varchar;
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS activity_visibility jsonb DEFAULT '{}'::jsonb;
      CREATE TABLE IF NOT EXISTS friend_favorites (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL,
        friend_id varchar NOT NULL,
        created_at timestamp DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS friend_favorites_user_idx ON friend_favorites (user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS friend_favorites_user_friend_uq ON friend_favorites (user_id, friend_id);
      CREATE TABLE IF NOT EXISTS user_follows (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id varchar NOT NULL,
        following_id varchar NOT NULL,
        created_at timestamp DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS user_follows_follower_idx ON user_follows (follower_id);
      CREATE INDEX IF NOT EXISTS user_follows_following_idx ON user_follows (following_id);
      CREATE UNIQUE INDEX IF NOT EXISTS user_follows_follower_following_uq ON user_follows (follower_id, following_id);
      ALTER TABLE group_challenges ADD COLUMN IF NOT EXISTS audience varchar NOT NULL DEFAULT 'friends';
      ALTER TABLE group_challenges ADD COLUMN IF NOT EXISTS color varchar NOT NULL DEFAULT '#f97316';
      ALTER TABLE group_challenges ADD COLUMN IF NOT EXISTS emoji varchar NOT NULL DEFAULT '🏀';
      ALTER TABLE player_goals ADD COLUMN IF NOT EXISTS project_title varchar;
      ALTER TABLE player_goals ADD COLUMN IF NOT EXISTS project_type varchar;
      ALTER TABLE player_goals ADD COLUMN IF NOT EXISTS why_it_matters text;
      ALTER TABLE player_goals ADD COLUMN IF NOT EXISTS success_definition text;
      ALTER TABLE player_goals ADD COLUMN IF NOT EXISTS timeline_type varchar;
      ALTER TABLE player_goals ADD COLUMN IF NOT EXISTS target_date varchar;
      ALTER TABLE player_goals ADD COLUMN IF NOT EXISTS season_label varchar;
      ALTER TABLE player_goals ADD COLUMN IF NOT EXISTS current_chapter text;
      ALTER TABLE player_goals ADD COLUMN IF NOT EXISTS next_action text;
      ALTER TABLE player_goals ADD COLUMN IF NOT EXISTS success_signals jsonb;
      ALTER TABLE goal_clarifications ADD COLUMN IF NOT EXISTS options jsonb;
      ALTER TABLE goal_milestones ADD COLUMN IF NOT EXISTS milestone_type varchar NOT NULL DEFAULT 'progress';
      ALTER TABLE goal_milestones ADD COLUMN IF NOT EXISTS target_date varchar;
      ALTER TABLE goal_check_ins ADD COLUMN IF NOT EXISTS period_label varchar;
      CREATE TABLE IF NOT EXISTS coach_p_usage (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL,
        month_key varchar NOT NULL,
        question_count integer NOT NULL DEFAULT 0,
        updated_at timestamp DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS coach_p_usage_user_month_uq
        ON coach_p_usage (user_id, month_key);
      ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS game_id varchar;
      ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS thoughts text;
      CREATE INDEX IF NOT EXISTS journal_entries_user_created_idx
        ON journal_entries (user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS journal_entries_game_idx
        ON journal_entries (game_id);
      CREATE TABLE IF NOT EXISTS journal_prompt_votes (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL,
        prompt_id varchar NOT NULL,
        category varchar NOT NULL,
        created_at timestamp DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS journal_prompt_votes_user_prompt_uq
        ON journal_prompt_votes (user_id, prompt_id);
      CREATE INDEX IF NOT EXISTS journal_prompt_votes_prompt_idx
        ON journal_prompt_votes (prompt_id);
      CREATE TABLE IF NOT EXISTS coach_p_conversations (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL,
        title varchar(200) NOT NULL DEFAULT 'New Coach P conversation',
        summary text,
        summary_updated_at timestamp,
        message_count integer NOT NULL DEFAULT 0,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
      ALTER TABLE coach_p_conversations ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
      CREATE INDEX IF NOT EXISTS coach_p_conversations_user_updated_idx
        ON coach_p_conversations (user_id, updated_at);
      CREATE TABLE IF NOT EXISTS coach_p_messages (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id varchar NOT NULL,
        role varchar(20) NOT NULL,
        content text NOT NULL,
        model varchar(100),
        context_mode varchar(40),
        prompt_tokens integer,
        completion_tokens integer,
        total_tokens integer,
        latency_ms integer,
        created_at timestamp DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS coach_p_messages_conversation_created_idx
        ON coach_p_messages (conversation_id, created_at);
      CREATE TABLE IF NOT EXISTS coach_p_requests (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL,
        conversation_id varchar,
        operation varchar(30) NOT NULL DEFAULT 'chat',
        status varchar(20) NOT NULL DEFAULT 'completed',
        model varchar(100),
        context_mode varchar(40),
        prompt_tokens integer,
        cached_prompt_tokens integer,
        completion_tokens integer,
        total_tokens integer,
        input_cost_usd double precision,
        cached_input_cost_usd double precision,
        output_cost_usd double precision,
        estimated_cost_usd double precision,
        input_rate_per_million double precision,
        output_rate_per_million double precision,
        context_ms integer,
        prompt_ms integer,
        model_ms integer,
        total_ms integer,
        error_message text,
        created_at timestamp DEFAULT now()
      );
      ALTER TABLE coach_p_requests ADD COLUMN IF NOT EXISTS cached_prompt_tokens integer;
      ALTER TABLE coach_p_requests ADD COLUMN IF NOT EXISTS cached_input_cost_usd double precision;
      ALTER TABLE coach_p_requests ADD COLUMN IF NOT EXISTS input_rate_per_million double precision;
      ALTER TABLE coach_p_requests ADD COLUMN IF NOT EXISTS output_rate_per_million double precision;
      CREATE INDEX IF NOT EXISTS coach_p_requests_created_at_idx
        ON coach_p_requests (created_at);
      CREATE INDEX IF NOT EXISTS coach_p_requests_user_created_at_idx
        ON coach_p_requests (user_id, created_at);
    `);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}