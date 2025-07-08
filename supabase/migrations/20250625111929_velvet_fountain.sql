/*
  # Comprehensive Running Tracker Schema

  1. New Tables
    - `training_plans` - Structured training programs
    - `workouts` - Individual workout templates
    - `workout_sessions` - Completed workout instances
    - `routes` - Saved running routes
    - `splits` - Detailed kilometer/mile splits
    - `heart_rate_zones` - User's heart rate zones
    - `user_stats` - Aggregated statistics
    - `social_connections` - Friends/followers system
    - `activity_feed` - Social activity posts
    - `challenges` - Community challenges
    - `challenge_participants` - User challenge participation
    - `notifications` - In-app notifications
    - `user_preferences` - Detailed user settings
    - `gear` - Running gear tracking
    - `weather_history` - Historical weather data

  2. Enhanced Security
    - RLS policies for all tables
    - Friend-based visibility controls
    - Private/public content management

  3. Real-time Features
    - Live tracking data
    - Social activity updates
    - Challenge leaderboards
*/

-- Training Plans
CREATE TABLE IF NOT EXISTS training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_weeks integer NOT NULL,
  difficulty_level text NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  goal_type text NOT NULL CHECK (goal_type IN ('5k', '10k', 'half_marathon', 'marathon', 'general_fitness')),
  created_by uuid REFERENCES profiles(id),
  is_public boolean DEFAULT true,
  total_workouts integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Individual Workouts
CREATE TABLE IF NOT EXISTS workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_plan_id uuid REFERENCES training_plans(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  day_number integer NOT NULL,
  name text NOT NULL,
  description text,
  workout_type text NOT NULL CHECK (workout_type IN ('easy_run', 'interval', 'tempo', 'long_run', 'recovery', 'cross_training', 'rest')),
  target_distance real,
  target_duration integer, -- in seconds
  target_pace text,
  intensity_level integer CHECK (intensity_level BETWEEN 1 AND 10),
  instructions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Completed Workout Sessions
CREATE TABLE IF NOT EXISTS workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  workout_id uuid REFERENCES workouts(id),
  run_id uuid REFERENCES runs(id),
  completed_at timestamptz DEFAULT now(),
  rating integer CHECK (rating BETWEEN 1 AND 5),
  notes text,
  perceived_effort integer CHECK (perceived_effort BETWEEN 1 AND 10)
);

-- Saved Routes
CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  coordinates jsonb NOT NULL DEFAULT '[]'::jsonb,
  distance real NOT NULL DEFAULT 0,
  elevation_gain real DEFAULT 0,
  difficulty_rating real DEFAULT 0,
  surface_type text DEFAULT 'mixed' CHECK (surface_type IN ('road', 'trail', 'track', 'treadmill', 'mixed')),
  is_public boolean DEFAULT false,
  times_used integer DEFAULT 0,
  average_rating real DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Detailed Splits
CREATE TABLE IF NOT EXISTS splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES runs(id) ON DELETE CASCADE NOT NULL,
  split_number integer NOT NULL,
  distance real NOT NULL,
  duration integer NOT NULL, -- in seconds
  pace text NOT NULL,
  speed real NOT NULL,
  elevation_change real DEFAULT 0,
  heart_rate_avg integer,
  heart_rate_max integer,
  cadence integer,
  stride_length real,
  created_at timestamptz DEFAULT now()
);

-- Heart Rate Zones
CREATE TABLE IF NOT EXISTS heart_rate_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  zone_name text NOT NULL,
  zone_number integer NOT NULL CHECK (zone_number BETWEEN 1 AND 5),
  min_bpm integer NOT NULL,
  max_bpm integer NOT NULL,
  percentage_max_hr_min real NOT NULL,
  percentage_max_hr_max real NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, zone_number)
);

-- Aggregated User Statistics
CREATE TABLE IF NOT EXISTS user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stat_date date NOT NULL,
  total_distance real DEFAULT 0,
  total_duration integer DEFAULT 0, -- in seconds
  total_calories integer DEFAULT 0,
  total_elevation_gain real DEFAULT 0,
  average_pace text DEFAULT '0:00',
  average_speed real DEFAULT 0,
  max_speed real DEFAULT 0,
  total_runs integer DEFAULT 0,
  longest_run real DEFAULT 0,
  fastest_pace text DEFAULT '0:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, stat_date)
);

-- Social Connections
CREATE TABLE IF NOT EXISTS social_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Activity Feed
CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('run_completed', 'achievement_earned', 'goal_completed', 'challenge_joined', 'personal_record')),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility text DEFAULT 'friends' CHECK (visibility IN ('public', 'friends', 'private')),
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Community Challenges
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  challenge_type text NOT NULL CHECK (challenge_type IN ('distance', 'duration', 'frequency', 'elevation')),
  target_value real NOT NULL,
  unit text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT true,
  participants_count integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id),
  prize_description text,
  difficulty_level text DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  created_at timestamptz DEFAULT now()
);

-- Challenge Participation
CREATE TABLE IF NOT EXISTS challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  current_progress real DEFAULT 0,
  completed boolean DEFAULT false,
  completion_date timestamptz,
  rank integer,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- In-app Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('achievement', 'goal', 'social', 'challenge', 'reminder', 'system')),
  data jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enhanced User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  notifications_enabled boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  email_notifications boolean DEFAULT false,
  social_sharing boolean DEFAULT true,
  activity_visibility text DEFAULT 'friends' CHECK (activity_visibility IN ('public', 'friends', 'private')),
  auto_pause boolean DEFAULT true,
  gps_accuracy text DEFAULT 'high' CHECK (gps_accuracy IN ('low', 'medium', 'high')),
  voice_guidance boolean DEFAULT true,
  haptic_feedback boolean DEFAULT true,
  dark_mode boolean DEFAULT false,
  measurement_units text DEFAULT 'metric' CHECK (measurement_units IN ('metric', 'imperial')),
  heart_rate_monitoring boolean DEFAULT false,
  weekly_goal_reminder boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Running Gear
CREATE TABLE IF NOT EXISTS gear (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  gear_type text NOT NULL CHECK (gear_type IN ('shoes', 'watch', 'clothing', 'accessories')),
  brand text,
  model text,
  purchase_date date,
  total_distance real DEFAULT 0,
  total_time integer DEFAULT 0, -- in seconds
  status text DEFAULT 'active' CHECK (status IN ('active', 'retired', 'maintenance')),
  notes text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Weather History
CREATE TABLE IF NOT EXISTS weather_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_name text NOT NULL,
  latitude real NOT NULL,
  longitude real NOT NULL,
  recorded_at timestamptz NOT NULL,
  temperature real NOT NULL,
  feels_like real,
  humidity integer,
  wind_speed real,
  wind_direction integer,
  pressure real,
  visibility real,
  uv_index real,
  condition text NOT NULL,
  description text
);

-- Enable RLS on all tables
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE heart_rate_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE gear ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_history ENABLE ROW LEVEL SECURITY;

-- Training Plans Policies
CREATE POLICY "Users can read public training plans"
  ON training_plans FOR SELECT
  TO authenticated
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can manage own training plans"
  ON training_plans FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Workouts Policies
CREATE POLICY "Users can read workouts from accessible plans"
  ON workouts FOR SELECT
  TO authenticated
  USING (
    training_plan_id IN (
      SELECT id FROM training_plans 
      WHERE is_public = true OR created_by = auth.uid()
    )
  );

-- Workout Sessions Policies
CREATE POLICY "Users can manage own workout sessions"
  ON workout_sessions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Routes Policies
CREATE POLICY "Users can read accessible routes"
  ON routes FOR SELECT
  TO authenticated
  USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can manage own routes"
  ON routes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Splits Policies
CREATE POLICY "Users can read own splits"
  ON splits FOR SELECT
  TO authenticated
  USING (
    run_id IN (SELECT id FROM runs WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage own splits"
  ON splits FOR ALL
  TO authenticated
  USING (
    run_id IN (SELECT id FROM runs WHERE user_id = auth.uid())
  )
  WITH CHECK (
    run_id IN (SELECT id FROM runs WHERE user_id = auth.uid())
  );

-- Heart Rate Zones Policies
CREATE POLICY "Users can manage own heart rate zones"
  ON heart_rate_zones FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- User Stats Policies
CREATE POLICY "Users can read own stats"
  ON user_stats FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage user stats"
  ON user_stats FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Social Connections Policies
CREATE POLICY "Users can manage own connections"
  ON social_connections FOR ALL
  TO authenticated
  USING (follower_id = auth.uid() OR following_id = auth.uid())
  WITH CHECK (follower_id = auth.uid());

-- Activity Feed Policies
CREATE POLICY "Users can read relevant activity feed"
  ON activity_feed FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (visibility = 'public') OR
    (visibility = 'friends' AND user_id IN (
      SELECT following_id FROM social_connections 
      WHERE follower_id = auth.uid() AND status = 'accepted'
    ))
  );

CREATE POLICY "Users can manage own activity feed"
  ON activity_feed FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Challenges Policies
CREATE POLICY "Users can read active challenges"
  ON challenges FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can create challenges"
  ON challenges FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Challenge Participants Policies
CREATE POLICY "Users can manage own challenge participation"
  ON challenge_participants FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read challenge leaderboards"
  ON challenge_participants FOR SELECT
  TO authenticated
  USING (true);

-- Notifications Policies
CREATE POLICY "Users can manage own notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- User Preferences Policies
CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Gear Policies
CREATE POLICY "Users can manage own gear"
  ON gear FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Weather History Policies
CREATE POLICY "Authenticated users can read weather history"
  ON weather_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert weather history"
  ON weather_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS training_plans_public_idx ON training_plans(is_public, created_by);
CREATE INDEX IF NOT EXISTS workouts_plan_idx ON workouts(training_plan_id, week_number, day_number);
CREATE INDEX IF NOT EXISTS workout_sessions_user_idx ON workout_sessions(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS routes_user_public_idx ON routes(user_id, is_public);
CREATE INDEX IF NOT EXISTS splits_run_idx ON splits(run_id, split_number);
CREATE INDEX IF NOT EXISTS user_stats_user_date_idx ON user_stats(user_id, stat_date DESC);
CREATE INDEX IF NOT EXISTS social_connections_follower_idx ON social_connections(follower_id, status);
CREATE INDEX IF NOT EXISTS social_connections_following_idx ON social_connections(following_id, status);
CREATE INDEX IF NOT EXISTS activity_feed_user_visibility_idx ON activity_feed(user_id, visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS challenges_active_dates_idx ON challenges(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS challenge_participants_challenge_progress_idx ON challenge_participants(challenge_id, current_progress DESC);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS gear_user_type_idx ON gear(user_id, gear_type, status);
CREATE INDEX IF NOT EXISTS weather_history_location_time_idx ON weather_history(latitude, longitude, recorded_at DESC);

-- Insert sample training plans
INSERT INTO training_plans (name, description, duration_weeks, difficulty_level, goal_type, is_public, total_workouts) VALUES
('Couch to 5K', 'Perfect for beginners who want to run their first 5K', 9, 'beginner', '5k', true, 27),
('10K Training Plan', 'Intermediate plan to achieve your first 10K', 8, 'intermediate', '10k', true, 32),
('Half Marathon Prep', 'Comprehensive 12-week half marathon training', 12, 'intermediate', 'half_marathon', true, 60),
('Marathon Training', 'Advanced 16-week marathon preparation', 16, 'advanced', 'marathon', true, 80),
('Base Building', 'Build your aerobic base with easy runs', 6, 'beginner', 'general_fitness', true, 36)
ON CONFLICT DO NOTHING;

-- Insert sample challenges
INSERT INTO challenges (name, description, challenge_type, target_value, unit, start_date, end_date, difficulty_level, prize_description) VALUES
('January Distance Challenge', 'Run 100km in January', 'distance', 100, 'km', '2024-01-01', '2024-01-31', 'medium', 'Digital badge and bragging rights'),
('Weekly 5K', 'Complete at least one 5K run every week for a month', 'frequency', 4, 'runs', '2024-01-01', '2024-01-28', 'easy', 'Consistency champion badge'),
('Elevation Climber', 'Gain 1000m of elevation this month', 'elevation', 1000, 'meters', '2024-01-01', '2024-01-31', 'hard', 'Mountain climber achievement'),
('Speed Demon', 'Run 50km at sub-5:00 pace', 'distance', 50, 'km', '2024-01-01', '2024-02-29', 'hard', 'Speed demon title')
ON CONFLICT DO NOTHING;

-- Insert default heart rate zones (based on 180 bpm max HR)
DO $$
DECLARE
    profile_record RECORD;
BEGIN
    FOR profile_record IN SELECT id FROM profiles LOOP
        INSERT INTO heart_rate_zones (user_id, zone_name, zone_number, min_bpm, max_bpm, percentage_max_hr_min, percentage_max_hr_max) VALUES
        (profile_record.id, 'Recovery', 1, 90, 108, 50, 60),
        (profile_record.id, 'Aerobic Base', 2, 108, 126, 60, 70),
        (profile_record.id, 'Aerobic', 3, 126, 144, 70, 80),
        (profile_record.id, 'Threshold', 4, 144, 162, 80, 90),
        (profile_record.id, 'Neuromuscular', 5, 162, 180, 90, 100)
        ON CONFLICT (user_id, zone_number) DO NOTHING;
    END LOOP;
END $$;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_training_plans_updated_at
  BEFORE UPDATE ON training_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_connections_updated_at
  BEFORE UPDATE ON social_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gear_updated_at
  BEFORE UPDATE ON gear
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();