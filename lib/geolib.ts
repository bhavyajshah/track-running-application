// Geolib-like functions for distance calculation
export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param start Starting coordinate
 * @param end Ending coordinate
 * @returns Distance in kilometers
 */
export function getDistance(start: Coordinate, end: Coordinate): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(end.latitude - start.latitude);
  const dLon = toRadians(end.longitude - start.longitude);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
           Math.cos(toRadians(start.latitude)) * Math.cos(toRadians(end.latitude)) * 
           Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance; // Returns distance in kilometers
}

/**
 * Calculate total distance from an array of coordinates
 * @param coordinates Array of coordinates
 * @returns Total distance in kilometers
 */
export function getTotalDistance(coordinates: Coordinate[]): number {
  if (coordinates.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 1; i < coordinates.length; i++) {
    totalDistance += getDistance(coordinates[i - 1], coordinates[i]);
  }
  
  return totalDistance;
}

/**
 * Calculate speed in km/h between two coordinates with timestamps
 * @param start Starting coordinate with timestamp
 * @param end Ending coordinate with timestamp
 * @returns Speed in km/h
 */
export function getSpeed(
  start: Coordinate & { timestamp: number }, 
  end: Coordinate & { timestamp: number }
): number {
  const distance = getDistance(start, end);
  const timeDiff = (end.timestamp - start.timestamp) / 1000 / 3600; // Convert to hours
  
  if (timeDiff === 0) return 0;
  return distance / timeDiff;
}

/**
 * Calculate pace in min/km from speed
 * @param speed Speed in km/h
 * @returns Pace object with minutes and seconds
 */
export function getPaceFromSpeed(speed: number): { minutes: number; seconds: number; formatted: string } {
  if (speed === 0) return { minutes: 0, seconds: 0, formatted: '0:00' };
  
  const paceMinutes = 60 / speed;
  const minutes = Math.floor(paceMinutes);
  const seconds = Math.round((paceMinutes - minutes) * 60);
  
  return {
    minutes,
    seconds,
    formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`
  };
}

/**
 * Calculate calories burned based on distance, duration, and user weight
 * @param distance Distance in km
 * @param durationMinutes Duration in minutes
 * @param weightKg User weight in kg (default 70kg)
 * @returns Estimated calories burned
 */
export function calculateCalories(
  distance: number, 
  durationMinutes: number, 
  weightKg: number = 70
): number {
  // MET (Metabolic Equivalent of Task) for running varies by pace
  const pace = distance > 0 ? durationMinutes / distance : 0;
  
  let met: number;
  if (pace < 6) met = 16; // Very fast running
  else if (pace < 7) met = 12; // Fast running
  else if (pace < 8) met = 10; // Moderate running
  else if (pace < 10) met = 8; // Light jogging
  else met = 6; // Walking/very light jogging
  
  // Calories = MET × weight(kg) × time(hours)
  const calories = met * weightKg * (durationMinutes / 60);
  return Math.round(calories);
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format duration from seconds to readable format
 * @param seconds Duration in seconds
 * @returns Formatted time string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}