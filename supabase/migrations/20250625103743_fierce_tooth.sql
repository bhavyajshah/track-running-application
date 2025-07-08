/*
  # Create runs table and related schema

  1. New Tables
    - `runs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `distance` (real, distance in km)
      - `duration` (integer, duration in seconds)
      - `calories` (integer, calories burned)
      - `avg_speed` (real, average speed in km/h)
      - `max_speed` (real, maximum speed in km/h)
      - `pace` (text, average pace as string)
      - `elevation_gain` (real, elevation gain in meters)
      - `route_coordinates` (jsonb, array of GPS coordinates)
      - `location` (text, location name)
      - `weather_data` (jsonb, weather information)
      - `splits` (jsonb, kilometer splits data)
      - `start_time` (timestamptz, when run started)
      - `end_time` (timestamptz, when run ended)
      - `created_at` (timestamptz, record creation time)

  2. Security
    - Enable RLS on `runs` table
    - Add policies for users to manage their own runs
*/

CREATE TABLE IF NOT EXISTS runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  distance real NOT NULL DEFAULT 0,
  duration integer NOT NULL DEFAULT 0,
  calories integer DEFAULT 0,
  avg_speed real DEFAULT 0,
  max_speed real DEFAULT 0,
  pace text DEFAULT '0:00',
  elevation_gain real DEFAULT 0,
  route_coordinates jsonb DEFAULT '[]'::jsonb,
  location text DEFAULT 'Unknown Location',
  weather_data jsonb DEFAULT '{}'::jsonb,
  splits jsonb DEFAULT '[]'::jsonb,
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own runs"
  ON runs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own runs"
  ON runs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own runs"
  ON runs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own runs"
  ON runs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS runs_user_id_idx ON runs(user_id);
CREATE INDEX IF NOT EXISTS runs_created_at_idx ON runs(created_at DESC);
CREATE INDEX IF NOT EXISTS runs_distance_idx ON runs(distance);