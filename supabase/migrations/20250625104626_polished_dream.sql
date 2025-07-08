/*
  # Create comprehensive user system

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `full_name` (text)
      - `avatar_url` (text)
      - `date_of_birth` (date)
      - `weight` (real)
      - `height` (real)
      - `fitness_level` (text)
      - `weekly_goal` (real)
      - `preferred_units` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `goals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text)
      - `description` (text)
      - `type` (text)
      - `target_value` (real)
      - `current_value` (real)
      - `unit` (text)
      - `period` (text)
      - `deadline` (date)
      - `completed` (boolean)
      - `created_at` (timestamp)

    - `achievements`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `icon` (text)
      - `category` (text)
      - `requirement_type` (text)
      - `requirement_value` (real)
      - `points` (integer)

    - `user_achievements`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `achievement_id` (uuid, references achievements)
      - `earned_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  date_of_birth date,
  weight real DEFAULT 70,
  height real DEFAULT 170,
  fitness_level text DEFAULT 'beginner',
  weekly_goal real DEFAULT 50,
  preferred_units text DEFAULT 'metric',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL, -- 'distance', 'time', 'calories', 'frequency'
  target_value real NOT NULL,
  current_value real DEFAULT 0,
  unit text NOT NULL,
  period text NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
  deadline date,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  category text NOT NULL, -- 'distance', 'speed', 'consistency', 'milestone'
  requirement_type text NOT NULL, -- 'total_distance', 'single_run', 'streak', etc.
  requirement_value real NOT NULL,
  points integer DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

-- Create user_achievements junction table
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id uuid REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Goals policies
CREATE POLICY "Users can manage own goals"
  ON goals
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Achievements policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can read achievements"
  ON achievements
  FOR SELECT
  TO authenticated
  USING (true);

-- User achievements policies
CREATE POLICY "Users can read own achievements"
  ON user_achievements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can earn achievements"
  ON user_achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS goals_user_id_idx ON goals(user_id);
CREATE INDEX IF NOT EXISTS goals_deadline_idx ON goals(deadline);
CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS user_achievements_earned_at_idx ON user_achievements(earned_at DESC);

-- Insert sample achievements
INSERT INTO achievements (title, description, icon, category, requirement_type, requirement_value, points) VALUES
('First Steps', 'Complete your first run', '👟', 'milestone', 'total_runs', 1, 50),
('5K Runner', 'Complete a 5km run', '🏃‍♀️', 'distance', 'single_run_distance', 5, 100),
('10K Champion', 'Complete a 10km run', '🏆', 'distance', 'single_run_distance', 10, 200),
('Speed Demon', 'Run at pace under 5:00 min/km', '⚡', 'speed', 'best_pace', 300, 150),
('Consistency King', 'Run 7 days in a row', '📅', 'consistency', 'run_streak', 7, 300),
('Mountain Climber', 'Gain 500m elevation in one run', '⛰️', 'elevation', 'single_run_elevation', 500, 250),
('Marathon Legend', 'Complete a marathon (42.2km)', '🎖️', 'distance', 'single_run_distance', 42.2, 1000),
('Century Club', 'Run 100km in a month', '💯', 'milestone', 'monthly_distance', 100, 500),
('Early Bird', 'Complete 10 morning runs (before 8 AM)', '🌅', 'consistency', 'morning_runs', 10, 200),
('Night Owl', 'Complete 10 evening runs (after 7 PM)', '🌙', 'consistency', 'evening_runs', 10, 200)
ON CONFLICT DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();