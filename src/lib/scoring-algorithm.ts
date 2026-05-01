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
  // (for rain and cloud cover when user wants 0)
  if (treatZeroAsIdeal && min === 0) {
    if (value === 0) {
      return 100; // Perfect
    }
    if (value <= max) {
      // Linear decay from 100 at 0 to 0 at max
      return 100 * (1 - value / max);
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
    // Allow some tolerance: score decays to 0 at 2x range below minimum
    const tolerance = range * 2;
    const score = Math.max(0, 100 * (1 - distance / tolerance));
    return score;
  }

  // Above maximum: calculate distance penalty
  if (value > max) {
    const range = max - min;
    const distance = value - max;
    // Allow some tolerance: score decays to 0 at 2x range above maximum
    const tolerance = range * 2;
    const score = Math.max(0, 100 * (1 - distance / tolerance));
    return score;
  }

  return 0;
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

  const windScore = calculateParameterScore(
    weatherData.windSpeed,
    preferences.wind.min,
    preferences.wind.max,
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

  // Calculate effective weights based on priority sections
  const tempWeight = getParameterWeight("temperature", preferences);
  const rainWeight = getParameterWeight("rain", preferences);
  const windWeight = getParameterWeight("wind", preferences);
  const humidityWeight = getParameterWeight("humidity", preferences);
  const cloudWeight = getParameterWeight("cloudCover", preferences);

  // Calculate total weight for normalization
  const totalWeight = tempWeight + rainWeight + windWeight + humidityWeight + cloudWeight;

  // Calculate weighted total score and normalize
  const weightedScore =
    tempScore * tempWeight +
    rainScore * rainWeight +
    windScore * windWeight +
    humidityScore * humidityWeight +
    cloudScore * cloudWeight;

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
    temperature: { min: 65, max: 75 },
    humidity: { min: 30, max: 60 },
    wind: { min: 0, max: 10 },
    rain: { min: 0, max: 20 },
    cloudCover: { min: 0, max: 30 },
    priorityOrder: {
      temperature: 0, // Highest Priority
      rain: 0, // Highest Priority
      wind: 1, // High Priority
      humidity: 2, // Medium Priority
      cloudCover: 2, // Medium Priority
    },
    sectionOrder: {
      0: ["temperature", "rain"],
      1: ["wind"],
      2: ["humidity", "cloudCover"],
      3: [],
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

/**
 * Group scores by day and calculate daily stats
 */
export function getScoresByDay(scores: SkyScore[]) {
  const dayGroups = new Map<string, SkyScore[]>();

  scores.forEach((score) => {
    const date = new Date(score.timestamp).toLocaleDateString();
    if (!dayGroups.has(date)) {
      dayGroups.set(date, []);
    }
    dayGroups.get(date)!.push(score);
  });

  const dailyStats = Array.from(dayGroups.entries()).map(([date, dayScores]) => {
    const scores = dayScores.map((s) => s.score);
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    return {
      date,
      average: Math.round(avg),
      min,
      max,
      count: dayScores.length,
    };
  });

  return dailyStats;
}
