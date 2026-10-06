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
      ALTER TABLE programs ALTER COLUMN is_pro SET DEFAULT true;
      ALTER TABLE programs ADD COLUMN IF NOT EXISTS content_type varchar NOT NULL DEFAULT 'program';
      ALTER TABLE program_items ADD COLUMN IF NOT EXISTS key_takeaways text[];
      UPDATE programs SET is_pro = true WHERE is_published = true;
      ALTER TABLE workout_drills ADD COLUMN IF NOT EXISTS coaching_notes text;
      ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS school_name varchar;
      ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS display_stats jsonb NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS card_career_stats jsonb NOT NULL DEFAULT '["ppg","rpg","apg"]'::jsonb;
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS activity_visibility jsonb DEFAULT '{}'::jsonb;
       ALTER TABLE seasons ADD COLUMN IF NOT EXISTS start_date timestamp;
       ALTER TABLE seasons ADD COLUMN IF NOT EXISTS end_date timestamp;
       ALTER TABLE seasons ADD COLUMN IF NOT EXISTS team_goal text;
       ALTER TABLE games ADD COLUMN IF NOT EXISTS tipoff_time varchar;
       ALTER TABLE games ADD COLUMN IF NOT EXISTS event_type varchar DEFAULT 'game';
       ALTER TABLE career_profiles ADD COLUMN IF NOT EXISTS competitive_basketball boolean;
      CREATE TABLE IF NOT EXISTS player_setup_profiles (
        user_id varchar PRIMARY KEY,
        answers jsonb NOT NULL DEFAULT '{}'::jsonb,
        completed_at timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS application_migration_flags (
        migration_key varchar PRIMARY KEY,
        applied_at timestamp DEFAULT now()
      );
      WITH first_player_setup_backfill AS (
        INSERT INTO application_migration_flags (migration_key)
        VALUES ('player_setup_profiles_grandfather_existing_users')
        ON CONFLICT DO NOTHING
        RETURNING migration_key
      )
      INSERT INTO player_setup_profiles (user_id, answers, completed_at)
      SELECT legacy_users.user_id, '{}'::jsonb, now()
      FROM (
        SELECT user_id FROM career_profiles WHERE onboarding_completed = true
        UNION
        SELECT user_id FROM user_profiles WHERE full_profile_completed = true
      ) AS legacy_users
      CROSS JOIN first_player_setup_backfill
      ON CONFLICT (user_id) DO NOTHING;
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
      CREATE TABLE IF NOT EXISTS custom_workout_requests (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL,
        status varchar NOT NULL DEFAULT 'submitted',
        improvement_focus text NOT NULL,
        desired_outcome text NOT NULL,
        available_time integer NOT NULL,
        equipment_constraints text NOT NULL,
        additional_notes text,
        admin_notes text,
        decline_reason text,
        started_at timestamp,
        completed_at timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS custom_workout_requests_user_idx
        ON custom_workout_requests (user_id, created_at);
      CREATE INDEX IF NOT EXISTS custom_workout_requests_queue_idx
        ON custom_workout_requests (status, created_at);
      CREATE TABLE IF NOT EXISTS custom_workout_assignments (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
         request_id varchar UNIQUE,
        player_id varchar NOT NULL,
        assigned_by varchar NOT NULL,
        workout_id varchar NOT NULL,
        notes text,
        status varchar NOT NULL DEFAULT 'assigned',
        completed_at timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS custom_workout_assignments_player_idx
        ON custom_workout_assignments (player_id, created_at);
      CREATE INDEX IF NOT EXISTS custom_workout_assignments_workout_idx
        ON custom_workout_assignments (workout_id);
       ALTER TABLE custom_workout_requests DROP COLUMN IF EXISTS preferred_schedule;
       ALTER TABLE custom_workout_assignments DROP COLUMN IF EXISTS due_date;
       ALTER TABLE custom_workout_assignments ALTER COLUMN request_id DROP NOT NULL;
       ALTER TABLE shooting_cohort_settings ADD COLUMN IF NOT EXISTS goal_three_point_percent integer;
       ALTER TABLE shooting_cohort_settings ADD COLUMN IF NOT EXISTS goal_mid_range_percent integer;
       ALTER TABLE shooting_cohort_settings ADD COLUMN IF NOT EXISTS goal_free_throw_percent integer;
       ALTER TABLE shooting_cohort_assessments ADD COLUMN IF NOT EXISTS protocol_version integer NOT NULL DEFAULT 1;
       ALTER TABLE shooting_cohort_assessments ADD COLUMN IF NOT EXISTS three_point_results jsonb;
       ALTER TABLE shooting_cohort_assessments ADD COLUMN IF NOT EXISTS mid_range_results jsonb;
       ALTER TABLE shooting_cohort_assessments ALTER COLUMN distance_feet DROP NOT NULL;
       ALTER TABLE shooting_cohort_assessments ALTER COLUMN spot_up_results DROP NOT NULL;
       ALTER TABLE shooting_cohort_assessments ALTER COLUMN off_dribble_results DROP NOT NULL;
       ALTER TABLE shooting_cohort_video_submissions ADD COLUMN IF NOT EXISTS workout_request_id varchar;
       ALTER TABLE shooting_cohort_video_submissions ADD COLUMN IF NOT EXISTS founder_feedback text;
       ALTER TABLE shooting_cohort_video_submissions ADD COLUMN IF NOT EXISTS feedback_updated_at timestamp;
       ALTER TABLE shooting_cohort_video_submissions ADD COLUMN IF NOT EXISTS feedback_updated_by varchar;
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL UNIQUE,
        push_enabled boolean NOT NULL DEFAULT true,
        categories jsonb NOT NULL DEFAULT '{}'::jsonb,
        onboarding_prompt_seen boolean NOT NULL DEFAULT false,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS notification_dispatches (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL,
        kind varchar NOT NULL,
        period_key varchar NOT NULL,
        created_at timestamp DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS notification_dispatches_user_kind_period_uq
        ON notification_dispatches (user_id, kind, period_key);
      CREATE INDEX IF NOT EXISTS notification_dispatches_kind_period_idx
        ON notification_dispatches (kind, period_key);
    `);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}