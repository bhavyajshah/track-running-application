/*
  # Enhanced Achievements System

  1. Clear existing achievements
  2. Add comprehensive set of 35+ achievements
  3. Categories: distance, speed, consistency, milestone, elevation, social, challenges
  4. Different difficulty levels and point values
*/

-- Clear existing achievements to avoid conflicts
DELETE FROM user_achievements;
DELETE FROM achievements;

-- Insert comprehensive achievement set
INSERT INTO achievements (title, description, icon, category, requirement_type, requirement_value, points) VALUES
-- Distance Achievements
('First Steps', 'Complete your first 1km run', '👟', 'milestone', 'single_run_distance', 1, 25),
('5K Rookie', 'Complete your first 5km run', '🏃‍♀️', 'distance', 'single_run_distance', 5, 100),
('10K Warrior', 'Complete a 10km run', '🏆', 'distance', 'single_run_distance', 10, 200),
('Half Marathon Hero', 'Complete a 21.1km run', '🎖️', 'distance', 'single_run_distance', 21.1, 500),
('Marathon Legend', 'Complete a full marathon (42.2km)', '👑', 'distance', 'single_run_distance', 42.2, 1000),
('Ultra Runner', 'Complete a 50km run', '⚡', 'distance', 'single_run_distance', 50, 1500),
('Century Runner', 'Run 100km in total', '💯', 'distance', 'total_distance', 100, 300),
('500K Club', 'Run 500km in total', '🌟', 'distance', 'total_distance', 500, 800),
('1000K Master', 'Run 1000km in total', '🚀', 'distance', 'total_distance', 1000, 1200),

-- Speed Achievements
('Speed Walker', 'Maintain 6+ km/h for 1km', '🚶‍♀️', 'speed', 'pace_under', 10, 50),
('Jogger', 'Run under 8:00 min/km pace', '🏃', 'speed', 'pace_under', 8, 75),
('Runner', 'Run under 6:00 min/km pace', '🏃‍♂️', 'speed', 'pace_under', 6, 150),
('Speed Demon', 'Run under 5:00 min/km pace', '⚡', 'speed', 'pace_under', 5, 250),
('Lightning Bolt', 'Run under 4:00 min/km pace', '⚡⚡', 'speed', 'pace_under', 4, 400),
('Cheetah', 'Run under 3:30 min/km pace', '🐆', 'speed', 'pace_under', 3.5, 600),

-- Consistency Achievements
('Weekend Warrior', 'Run 2 days in a row', '📅', 'consistency', 'consecutive_days', 2, 50),
('Week Streak', 'Run 7 days in a row', '🔥', 'consistency', 'consecutive_days', 7, 200),
('Month Champion', 'Run 30 days in a row', '📆', 'consistency', 'consecutive_days', 30, 500),
('Habit Former', 'Complete 10 runs', '✅', 'consistency', 'total_runs', 10, 100),
('Dedication', 'Complete 50 runs', '💪', 'consistency', 'total_runs', 50, 300),
('Century Runs', 'Complete 100 runs', '🎯', 'consistency', 'total_runs', 100, 600),

-- Time-based Achievements
('Early Bird', 'Complete 5 morning runs (before 8 AM)', '🌅', 'milestone', 'morning_runs', 5, 150),
('Night Owl', 'Complete 5 evening runs (after 7 PM)', '🌙', 'milestone', 'evening_runs', 5, 150),
('Sunrise Runner', 'Run during sunrise (5-7 AM)', '🌄', 'milestone', 'sunrise_runs', 1, 100),
('Midnight Runner', 'Run after midnight', '🌃', 'milestone', 'midnight_runs', 1, 200),

-- Elevation Achievements
('Hill Climber', 'Gain 100m elevation in one run', '⛰️', 'elevation', 'single_run_elevation', 100, 150),
('Mountain Goat', 'Gain 500m elevation in one run', '🐐', 'elevation', 'single_run_elevation', 500, 300),
('Peak Crusher', 'Gain 1000m elevation in one run', '🏔️', 'elevation', 'single_run_elevation', 1000, 600),
('Elevation Master', 'Gain 5000m total elevation', '🗻', 'elevation', 'total_elevation', 5000, 400),

-- Weather Achievements
('Rain Runner', 'Complete a run in the rain', '🌧️', 'milestone', 'weather_runs', 1, 200),
('Heat Warrior', 'Run in temperatures above 30°C', '🌡️', 'milestone', 'hot_weather', 1, 150),
('Cold Fighter', 'Run in temperatures below 5°C', '❄️', 'milestone', 'cold_weather', 1, 150),

-- Social Achievements
('Motivator', 'Encourage 5 other runners', '👥', 'social', 'encouragements', 5, 200),
('Community Member', 'Join your first challenge', '🤝', 'social', 'challenges_joined', 1, 100),
('Challenge Winner', 'Win a community challenge', '🥇', 'social', 'challenges_won', 1, 400),

-- Special Achievements
('New Year Runner', 'Run on New Year\'s Day', '🎉', 'milestone', 'special_days', 1, 300),
('Birthday Runner', 'Run on your birthday', '🎂', 'milestone', 'birthday_run', 1, 250),
('Explorer', 'Run in 5 different locations', '🗺️', 'milestone', 'locations_visited', 5, 200),
('Global Runner', 'Run in 3 different countries', '🌍', 'milestone', 'countries_visited', 3, 500),

-- Endurance Achievements
('Endurance Builder', 'Run for 30 minutes straight', '⏱️', 'milestone', 'continuous_duration', 30, 100),
('Hour Power', 'Run for 60 minutes straight', '🕐', 'milestone', 'continuous_duration', 60, 300),
('Iron Will', 'Run for 120 minutes straight', '🔩', 'milestone', 'continuous_duration', 120, 600),

-- Fun Achievements
('Photographer', 'Take 10 run photos', '📸', 'milestone', 'photos_taken', 10, 100),
('Music Lover', 'Complete 25 runs with music', '🎵', 'milestone', 'music_runs', 25, 150),
('Zen Runner', 'Complete 10 meditation runs', '🧘', 'milestone', 'meditation_runs', 10, 200);