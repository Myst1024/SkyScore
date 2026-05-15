import type {
  HourlyWeatherData,
  PrioritySection,
  SkyScore,
  WeatherParameter,
  WeatherPreferences,
} from "./types";

// Section weights based on priority level (0 = highest, 3 = lowest)
const SECTION_WEIGHTS: Record<PrioritySection, number> = {
  0: 2.0, // Highest Priority - 2x weight
  1: 1.0, // High Priority - 1x weight
  2: 0.4, // Medium Priority - 0.4x weight
  3: 0.0, // Doesn't Matter - 0x weight (no impact)
};

/**
 * Get the effective weight for a parameter based on its priority section
 */
function getParameterWeight(parameter: WeatherParameter, preferences: WeatherPreferences): number {
  const section = preferences.priorityOrder[parameter];
  return SECTION_WEIGHTS[section];
}

/**
 * Calculate score for a single parameter based on value and preferences
 * Returns a score from 0-100 (100 = perfect match)
 */
function calculateParameterScore(
  value: number,
  min: number,
  max: number,
  treatZeroAsIdeal: boolean = false,
): number {
  // Special case: if min === max, treat as "not a constraint"
  if (min === max) {
    // If they want exactly this value
    return value === min ? 100 : 0;
  }

  // Special case: if min is 0 and treatZeroAsIdeal is true
  // (for rain, wind, and cloud cover when user wants 0)
  if (treatZeroAsIdeal && min === 0) {
    const idealThreshold = max * 0.2; // First 20% of range is ideal

    if (value <= idealThreshold) {
      return 100; // Perfect score for first 20% of range
    }
    if (value <= max) {
      // Linear decay from 100 at idealThreshold to 0 at max
      const decayRange = max - idealThreshold;
      const distanceAboveIdeal = value - idealThreshold;
      return 100 * (1 - distanceAboveIdeal / decayRange);
    }
    return 0; // Above max
  }

  // Within range: perfect score
  if (value >= min && value <= max) {
    return 100;
  }

  // Below minimum: calculate distance penalty
  if (value < min) {
    const range = max - min;
    const distance = min - value;
    // Aggressive penalty: score decays to 0 at 1x range below minimum
    const tolerance = range * 1;
    const score = Math.max(0, 100 * (1 - distance / tolerance));
    return score;
  }

  // Above maximum: calculate distance penalty
  if (value > max) {
    const range = max - min;
    const distance = value - max;
    // Aggressive penalty: score decays to 0 at 1x range above maximum
    const tolerance = range * 1;
    const score = Math.max(0, 100 * (1 - distance / tolerance));
    return score;
  }

  return 0;
}

/**
 * Calculate score for sunlight parameter with special logic
 * If max is 100, treat middle-to-100 as perfect
 * Otherwise, treat it like other parameters
 */
function calculateSunlightScore(value: number, min: number, max: number): number {
  // Special case: if max is 100, treat middle-to-100 as perfect
  if (max === 100) {
    const midpoint = (min + max) / 2;

    // Value is at or above midpoint: perfect score
    if (value >= midpoint) {
      return 100;
    }

    // Below midpoint: scale linearly from negative (below min) to 100 (at midpoint)
    // The score at min is 0, and continues linearly below (capped at 0)
    const range = midpoint - min;
    const distanceAboveMin = value - min;
    const score = (distanceAboveMin / range) * 100;
    return Math.max(0, Math.round(score));
  }

  // Otherwise, use standard parameter scoring
  return calculateParameterScore(value, min, max);
}

/**
 * Calculate Sky Score for a single hour of weather data
 */
export function calculateScoreForHour(
  weatherData: HourlyWeatherData,
  preferences: WeatherPreferences,
): SkyScore {
  // Calculate individual parameter scores
  const tempScore = calculateParameterScore(
    weatherData.temperature,
    preferences.temperature.min,
    preferences.temperature.max,
  );

  const humidityScore = calculateParameterScore(
    weatherData.humidity,
    preferences.humidity.min,
    preferences.humidity.max,
  );

  // Wind: treat 0 as ideal if min is 0
  const windScore = calculateParameterScore(
    weatherData.windSpeed,
    preferences.wind.min,
    preferences.wind.max,
    preferences.wind.min === 0,
  );

  // Rain: treat 0 as ideal if min is 0
  const rainScore = calculateParameterScore(
    weatherData.precipitationChance,
    preferences.rain.min,
    preferences.rain.max,
    preferences.rain.min === 0,
  );

  // Cloud cover: treat 0 as ideal if min is 0
  const cloudScore = calculateParameterScore(
    weatherData.cloudCover,
    preferences.cloudCover.min,
    preferences.cloudCover.max,
    preferences.cloudCover.min === 0,
  );

  // Sunlight: special scoring logic
  const sunlightScore = calculateSunlightScore(
    weatherData.sunlight,
    preferences.sunlight.min,
    preferences.sunlight.max,
  );

  // Calculate effective weights based on priority sections
  const tempWeight = getParameterWeight("temperature", preferences);
  const rainWeight = getParameterWeight("rain", preferences);
  const windWeight = getParameterWeight("wind", preferences);
  const humidityWeight = getParameterWeight("humidity", preferences);
  const cloudWeight = getParameterWeight("cloudCover", preferences);
  const sunlightWeight = getParameterWeight("sunlight", preferences);

  // Calculate total weight for normalization
  const totalWeight =
    tempWeight + rainWeight + windWeight + humidityWeight + cloudWeight + sunlightWeight;

  // Calculate weighted total score and normalize
  const weightedScore =
    tempScore * tempWeight +
    rainScore * rainWeight +
    windScore * windWeight +
    humidityScore * humidityWeight +
    cloudScore * cloudWeight +
    sunlightScore * sunlightWeight;

  const normalizedScore = weightedScore / totalWeight;

  return {
    timestamp: weatherData.timestamp,
    score: Math.round(normalizedScore),
    breakdown: {
      temperature: Math.round(tempScore),
      humidity: Math.round(humidityScore),
      wind: Math.round(windScore),
      rain: Math.round(rainScore),
      cloudCover: Math.round(cloudScore),
      sunlight: Math.round(sunlightScore),
    },
    weatherData,
  };
}

/**
 * Calculate scores for all periods in forecast
 */
export function calculateAllScores(
  periods: HourlyWeatherData[],
  preferences: WeatherPreferences,
): SkyScore[] {
  return periods.map((period) => calculateScoreForHour(period, preferences));
}

/**
 * Get default weather preferences (reasonable starting values)
 */
export function getDefaultPreferences(): WeatherPreferences {
  return {
    temperature: { min: 60, max: 90 },
    humidity: { min: 20, max: 70 },
    wind: { min: 0, max: 15 },
    rain: { min: 0, max: 20 },
    cloudCover: { min: 0, max: 70 },
    sunlight: { min: 0, max: 100 },
    priorityOrder: {
      temperature: 0, // Highest Priority
      rain: 0, // Highest Priority
      wind: 1, // High Priority
      humidity: 2, // Medium Priority
      cloudCover: 2, // Medium Priority
      sunlight: 3, // Doesn't Matter (default)
    },
    sectionOrder: {
      0: ["temperature", "rain"],
      1: ["wind"],
      2: ["humidity", "cloudCover"],
      3: ["sunlight"],
    },
  };
}

/**
 * Calculate summary statistics for scores
 */
export function calculateScoreStats(scores: SkyScore[]) {
  if (scores.length === 0) {
    return {
      average: 0,
      best: { score: 0, timestamp: "", index: 0 },
      worst: { score: 0, timestamp: "", index: 0 },
    };
  }

  const total = scores.reduce((sum, s) => sum + s.score, 0);
  const average = total / scores.length;

  let best: SkyScore = scores[0]!;
  let bestIndex = 0;
  let worst: SkyScore = scores[0]!;
  let worstIndex = 0;

  scores.forEach((score, index) => {
    if (score.score > best.score) {
      best = score;
      bestIndex = index;
    }
    if (score.score < worst.score) {
      worst = score;
      worstIndex = index;
    }
  });

  return {
    average: Math.round(average),
    best: { score: best.score, timestamp: best.timestamp, index: bestIndex },
    worst: {
      score: worst.score,
      timestamp: worst.timestamp,
      index: worstIndex,
    },
  };
}
