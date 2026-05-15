import { describe, expect, test } from "bun:test";
import {
  calculateAllScores,
  calculateScoreForHour,
  calculateScoreStats,
  getDefaultPreferences,
} from "./scoring-algorithm";
import type { HourlyWeatherData, PrioritySection, SkyScore, WeatherPreferences } from "./types";

// Helper to create minimal weather data for testing
function createWeatherData(overrides: Partial<HourlyWeatherData> = {}): HourlyWeatherData {
  return {
    timestamp: "2024-01-01T12:00:00Z",
    temperature: 70,
    humidity: 50,
    windSpeed: 5,
    precipitationChance: 0,
    cloudCover: 20,
    sunlight: 50,
    isDaytime: true,
    ...overrides,
  };
}

// Helper to create mock SkyScore for testing
function createMockScore(score: number, timestamp?: string): SkyScore {
  return {
    timestamp: timestamp || "2024-01-01T12:00:00Z",
    score,
    breakdown: {
      temperature: 0,
      humidity: 0,
      wind: 0,
      rain: 0,
      cloudCover: 0,
      sunlight: 0,
    },
    weatherData: createWeatherData({ timestamp }),
  };
}

describe("calculateSunlightScore", () => {
  // Helper to create minimal weather data for testing sunlight
  function createSunlightWeatherData(sunlight: number): HourlyWeatherData {
    return createWeatherData({ sunlight });
  }

  describe("when max = 100 (special sunlight logic)", () => {
    test("should have smoothly ascending scores as sunlight increases", () => {
      const preferences = {
        ...getDefaultPreferences(),
        sunlight: { min: 35, max: 100 },
        priorityOrder: {
          ...getDefaultPreferences().priorityOrder,
          sunlight: 0 as PrioritySection, // Highest priority to isolate sunlight scoring
          temperature: 3 as PrioritySection,
          humidity: 3 as PrioritySection,
          wind: 3 as PrioritySection,
          rain: 3 as PrioritySection,
          cloudCover: 3 as PrioritySection,
        },
      };

      // Test values below, at, and above min, approaching midpoint
      const testValues = [0, 10, 17, 29, 35, 41, 50, 60, 67, 75, 90, 100];
      const scores = testValues.map((sunlight) => {
        const weather = createSunlightWeatherData(sunlight);
        const score = calculateScoreForHour(weather, preferences);
        return { sunlight, score: score.breakdown.sunlight };
      });

      console.log("Sunlight scores:", scores);

      // Verify scores are monotonically increasing (or equal)
      for (let i = 1; i < scores.length; i++) {
        const prev = scores[i - 1]!;
        const curr = scores[i]!;
        expect(curr.score).toBeGreaterThanOrEqual(prev.score);
      }
    });

    test("values at or above midpoint should get perfect score (100)", () => {
      const preferences = {
        ...getDefaultPreferences(),
        sunlight: { min: 35, max: 100 },
      };

      // Test values at and above midpoint (67.5)
      const testValues = [68, 75, 90, 100];
      for (const sunlight of testValues) {
        const weather = createSunlightWeatherData(sunlight);
        const score = calculateScoreForHour(weather, preferences);
        expect(score.breakdown.sunlight).toBe(100);
      }
    });

    test("values below min should score worse than or equal to values at min", () => {
      const preferences = {
        ...getDefaultPreferences(),
        sunlight: { min: 35, max: 100 },
      };

      const belowMin = createSunlightWeatherData(29);
      const atMin = createSunlightWeatherData(35);

      const scoreBelowMin = calculateScoreForHour(belowMin, preferences);
      const scoreAtMin = calculateScoreForHour(atMin, preferences);

      expect(scoreBelowMin.breakdown.sunlight).toBeLessThanOrEqual(scoreAtMin.breakdown.sunlight);
    });

    test("values between min and midpoint should scale linearly from 0 to 100", () => {
      const preferences = {
        ...getDefaultPreferences(),
        sunlight: { min: 35, max: 100 },
      };

      const atMin = createSunlightWeatherData(35); // Should be 0
      const atMidpoint = createSunlightWeatherData(67.5); // Should be 100
      const inMiddle = createSunlightWeatherData(51.25); // Halfway between min and midpoint, should be ~50

      const scoreAtMin = calculateScoreForHour(atMin, preferences);
      const scoreInMiddle = calculateScoreForHour(inMiddle, preferences);
      const scoreAtMidpoint = calculateScoreForHour(atMidpoint, preferences);

      expect(scoreAtMin.breakdown.sunlight).toBe(0);
      expect(scoreInMiddle.breakdown.sunlight).toBeCloseTo(50, 0);
      expect(scoreAtMidpoint.breakdown.sunlight).toBe(100);
    });

    test("specific reported issue: 17→45, 29→82, 41→18 should be monotonically increasing", () => {
      const preferences = {
        ...getDefaultPreferences(),
        sunlight: { min: 35, max: 100 },
      };

      const score17 = calculateScoreForHour(createSunlightWeatherData(17), preferences);
      const score29 = calculateScoreForHour(createSunlightWeatherData(29), preferences);
      const score41 = calculateScoreForHour(createSunlightWeatherData(41), preferences);

      // These should be monotonically increasing (or equal)
      expect(score17.breakdown.sunlight).toBeLessThanOrEqual(score29.breakdown.sunlight);
      expect(score29.breakdown.sunlight).toBeLessThan(score41.breakdown.sunlight);
    });
  });

  describe("when max < 100 (standard parameter logic)", () => {
    test("values within range should get perfect score", () => {
      const preferences = {
        ...getDefaultPreferences(),
        sunlight: { min: 35, max: 70 },
      };

      const testValues = [35, 40, 50, 60, 70];
      for (const sunlight of testValues) {
        const weather = createSunlightWeatherData(sunlight);
        const score = calculateScoreForHour(weather, preferences);
        expect(score.breakdown.sunlight).toBe(100);
      }
    });

    test("values outside range should get penalized", () => {
      const preferences = {
        ...getDefaultPreferences(),
        sunlight: { min: 35, max: 70 },
      };

      const belowRange = createSunlightWeatherData(20);
      const aboveRange = createSunlightWeatherData(85);

      const scoreBelowRange = calculateScoreForHour(belowRange, preferences);
      const scoreAboveRange = calculateScoreForHour(aboveRange, preferences);

      expect(scoreBelowRange.breakdown.sunlight).toBeLessThan(100);
      expect(scoreAboveRange.breakdown.sunlight).toBeLessThan(100);
    });
  });
});

describe("calculateParameterScore (via temperature)", () => {
  // Testing the general parameter scoring logic through temperature

  test("values within range should get perfect score (100)", () => {
    const preferences = {
      ...getDefaultPreferences(),
      temperature: { min: 60, max: 80 },
    };

    const testCases = [60, 65, 70, 75, 80];
    for (const temp of testCases) {
      const weather = createWeatherData({ temperature: temp });
      const score = calculateScoreForHour(weather, preferences);
      expect(score.breakdown.temperature).toBe(100);
    }
  });

  test("value exactly at min should get perfect score", () => {
    const preferences = {
      ...getDefaultPreferences(),
      temperature: { min: 65, max: 85 },
    };

    const weather = createWeatherData({ temperature: 65 });
    const score = calculateScoreForHour(weather, preferences);
    expect(score.breakdown.temperature).toBe(100);
  });

  test("value exactly at max should get perfect score", () => {
    const preferences = {
      ...getDefaultPreferences(),
      temperature: { min: 65, max: 85 },
    };

    const weather = createWeatherData({ temperature: 85 });
    const score = calculateScoreForHour(weather, preferences);
    expect(score.breakdown.temperature).toBe(100);
  });

  test("values below min should get penalized progressively", () => {
    const preferences = {
      ...getDefaultPreferences(),
      temperature: { min: 60, max: 80 },
    };

    const scores = [55, 50, 40, 30, 20].map((temp) => {
      const weather = createWeatherData({ temperature: temp });
      return calculateScoreForHour(weather, preferences).breakdown.temperature;
    });

    // Scores should decrease as we move further from the range
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]!);
    }

    // All should be less than 100
    for (const score of scores) {
      expect(score).toBeLessThan(100);
    }
  });

  test("values above max should get penalized progressively", () => {
    const preferences = {
      ...getDefaultPreferences(),
      temperature: { min: 60, max: 80 },
    };

    const scores = [85, 90, 100, 110, 120].map((temp) => {
      const weather = createWeatherData({ temperature: temp });
      return calculateScoreForHour(weather, preferences).breakdown.temperature;
    });

    // Scores should decrease as we move further from the range
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]!);
    }

    // All should be less than 100
    for (const score of scores) {
      expect(score).toBeLessThan(100);
    }
  });

  test("extreme values far outside range should score 0 or near 0", () => {
    const preferences = {
      ...getDefaultPreferences(),
      temperature: { min: 60, max: 80 },
    };

    const extremelyLow = createWeatherData({ temperature: 0 });
    const extremelyHigh = createWeatherData({ temperature: 150 });

    const scoreLow = calculateScoreForHour(extremelyLow, preferences);
    const scoreHigh = calculateScoreForHour(extremelyHigh, preferences);

    expect(scoreLow.breakdown.temperature).toBe(0);
    expect(scoreHigh.breakdown.temperature).toBe(0);
  });

  test("when min equals max, only exact value should get perfect score", () => {
    const preferences = {
      ...getDefaultPreferences(),
      temperature: { min: 72, max: 72 },
    };

    const exact = createWeatherData({ temperature: 72 });
    const closeBelow = createWeatherData({ temperature: 71 });
    const closeAbove = createWeatherData({ temperature: 73 });

    const scoreExact = calculateScoreForHour(exact, preferences);
    const scoreBelow = calculateScoreForHour(closeBelow, preferences);
    const scoreAbove = calculateScoreForHour(closeAbove, preferences);

    expect(scoreExact.breakdown.temperature).toBe(100);
    expect(scoreBelow.breakdown.temperature).toBe(0);
    expect(scoreAbove.breakdown.temperature).toBe(0);
  });

  test("narrow range should have steeper penalty than wide range", () => {
    const narrowPrefs = {
      ...getDefaultPreferences(),
      temperature: { min: 70, max: 72 }, // range of 2
    };

    const widePrefs = {
      ...getDefaultPreferences(),
      temperature: { min: 50, max: 90 }, // range of 40
    };

    // Test same absolute distance from range
    const narrowWeather = createWeatherData({ temperature: 74 }); // 2 degrees above max
    const wideWeather = createWeatherData({ temperature: 92 }); // 2 degrees above max

    const narrowScore = calculateScoreForHour(narrowWeather, narrowPrefs);
    const wideScore = calculateScoreForHour(wideWeather, widePrefs);

    // Narrow range should penalize more for same absolute distance
    expect(narrowScore.breakdown.temperature).toBeLessThan(wideScore.breakdown.temperature);
  });
});

describe("calculateParameterScore for rain (treatZeroAsIdeal)", () => {
  test("zero precipitation should be perfect when min is 0", () => {
    const preferences = {
      ...getDefaultPreferences(),
      rain: { min: 0, max: 20 },
    };

    const weather = createWeatherData({ precipitationChance: 0 });
    const score = calculateScoreForHour(weather, preferences);
    expect(score.breakdown.rain).toBe(100);
  });

  test("precipitation should have ideal zone (0-20% of max) then decay to max when min is 0", () => {
    const preferences = {
      ...getDefaultPreferences(),
      rain: { min: 0, max: 20 },
    };

    const testCases = [
      { precip: 0, expectedScore: 100 },
      { precip: 4, expectedScore: 100 }, // Within 20% ideal threshold
      { precip: 5, expectedScore: 94 }, // Start of decay: 100*(1-(5-4)/(20-4))
      { precip: 10, expectedScore: 63 }, // 100*(1-(10-4)/(20-4))
      { precip: 15, expectedScore: 31 }, // 100*(1-(15-4)/(20-4))
      { precip: 20, expectedScore: 0 },
    ];

    for (const { precip, expectedScore } of testCases) {
      const weather = createWeatherData({ precipitationChance: precip });
      const score = calculateScoreForHour(weather, preferences);
      expect(score.breakdown.rain).toBe(expectedScore);
    }
  });

  test("precipitation above max should score 0 when min is 0", () => {
    const preferences = {
      ...getDefaultPreferences(),
      rain: { min: 0, max: 20 },
    };

    const testCases = [25, 50, 100];
    for (const precip of testCases) {
      const weather = createWeatherData({ precipitationChance: precip });
      const score = calculateScoreForHour(weather, preferences);
      expect(score.breakdown.rain).toBe(0);
    }
  });

  test("when min is not 0, should use standard parameter logic", () => {
    const preferences = {
      ...getDefaultPreferences(),
      rain: { min: 10, max: 30 },
    };

    const withinRange = createWeatherData({ precipitationChance: 20 });
    const belowRange = createWeatherData({ precipitationChance: 5 });
    const aboveRange = createWeatherData({ precipitationChance: 35 });

    const scoreWithin = calculateScoreForHour(withinRange, preferences);
    const scoreBelow = calculateScoreForHour(belowRange, preferences);
    const scoreAbove = calculateScoreForHour(aboveRange, preferences);

    expect(scoreWithin.breakdown.rain).toBe(100);
    expect(scoreBelow.breakdown.rain).toBeLessThan(100);
    expect(scoreAbove.breakdown.rain).toBeLessThan(100);
  });

  test("edge case: min=0, max=0 should only accept 0", () => {
    const preferences = {
      ...getDefaultPreferences(),
      rain: { min: 0, max: 0 },
    };

    const zeroPrecip = createWeatherData({ precipitationChance: 0 });
    const anyPrecip = createWeatherData({ precipitationChance: 1 });

    const scoreZero = calculateScoreForHour(zeroPrecip, preferences);
    const scoreAny = calculateScoreForHour(anyPrecip, preferences);

    expect(scoreZero.breakdown.rain).toBe(100);
    expect(scoreAny.breakdown.rain).toBe(0);
  });
});

describe("calculateParameterScore for cloudCover (treatZeroAsIdeal)", () => {
  test("zero cloud cover should be perfect when min is 0", () => {
    const preferences = {
      ...getDefaultPreferences(),
      cloudCover: { min: 0, max: 30 },
    };

    const weather = createWeatherData({ cloudCover: 0 });
    const score = calculateScoreForHour(weather, preferences);
    expect(score.breakdown.cloudCover).toBe(100);
  });

  test("cloud cover should have ideal zone (0-20% of max) then decay to max when min is 0", () => {
    const preferences = {
      ...getDefaultPreferences(),
      cloudCover: { min: 0, max: 40 },
    };

    const testCases = [
      { clouds: 0, expectedScore: 100 },
      { clouds: 8, expectedScore: 100 }, // Within 20% ideal threshold
      { clouds: 10, expectedScore: 94 }, // Start of decay: 100*(1-(10-8)/(40-8))
      { clouds: 20, expectedScore: 63 }, // 100*(1-(20-8)/(40-8))
      { clouds: 30, expectedScore: 31 }, // 100*(1-(30-8)/(40-8))
      { clouds: 40, expectedScore: 0 },
    ];

    for (const { clouds, expectedScore } of testCases) {
      const weather = createWeatherData({ cloudCover: clouds });
      const score = calculateScoreForHour(weather, preferences);
      expect(score.breakdown.cloudCover).toBe(expectedScore);
    }
  });

  test("cloud cover above max should score 0 when min is 0", () => {
    const preferences = {
      ...getDefaultPreferences(),
      cloudCover: { min: 0, max: 30 },
    };

    const testCases = [50, 75, 100];
    for (const clouds of testCases) {
      const weather = createWeatherData({ cloudCover: clouds });
      const score = calculateScoreForHour(weather, preferences);
      expect(score.breakdown.cloudCover).toBe(0);
    }
  });

  test("when min is not 0, should use standard parameter logic", () => {
    const preferences = {
      ...getDefaultPreferences(),
      cloudCover: { min: 20, max: 60 },
    };

    const withinRange = createWeatherData({ cloudCover: 40 });
    const belowRange = createWeatherData({ cloudCover: 10 });
    const aboveRange = createWeatherData({ cloudCover: 80 });

    const scoreWithin = calculateScoreForHour(withinRange, preferences);
    const scoreBelow = calculateScoreForHour(belowRange, preferences);
    const scoreAbove = calculateScoreForHour(aboveRange, preferences);

    expect(scoreWithin.breakdown.cloudCover).toBe(100);
    expect(scoreBelow.breakdown.cloudCover).toBeLessThan(100);
    expect(scoreAbove.breakdown.cloudCover).toBeLessThan(100);
  });
});

describe("calculateParameterScore for humidity", () => {
  test("humidity within range should score perfectly", () => {
    const preferences = {
      ...getDefaultPreferences(),
      humidity: { min: 30, max: 60 },
    };

    const testCases = [30, 40, 50, 60];
    for (const humidity of testCases) {
      const weather = createWeatherData({ humidity });
      const score = calculateScoreForHour(weather, preferences);
      expect(score.breakdown.humidity).toBe(100);
    }
  });

  test("humidity outside range should be penalized", () => {
    const preferences = {
      ...getDefaultPreferences(),
      humidity: { min: 30, max: 60 },
    };

    const tooLow = createWeatherData({ humidity: 10 });
    const tooHigh = createWeatherData({ humidity: 90 });

    const scoreLow = calculateScoreForHour(tooLow, preferences);
    const scoreHigh = calculateScoreForHour(tooHigh, preferences);

    expect(scoreLow.breakdown.humidity).toBeLessThan(100);
    expect(scoreHigh.breakdown.humidity).toBeLessThan(100);
  });

  test("extreme humidity values should score 0", () => {
    const preferences = {
      ...getDefaultPreferences(),
      humidity: { min: 30, max: 60 },
    };

    const extremeLow = createWeatherData({ humidity: 0 });
    const extremeHigh = createWeatherData({ humidity: 100 });

    const scoreLow = calculateScoreForHour(extremeLow, preferences);
    const scoreHigh = calculateScoreForHour(extremeHigh, preferences);

    expect(scoreLow.breakdown.humidity).toBe(0);
    expect(scoreHigh.breakdown.humidity).toBe(0);
  });
});

describe("calculateParameterScore for wind", () => {
  test("wind should have ideal zone (0-20% of max) when min is 0", () => {
    const preferences = {
      ...getDefaultPreferences(),
      wind: { min: 0, max: 15 },
    };

    // Ideal threshold = 15 * 0.2 = 3
    const idealWinds = [0, 1, 2, 3];
    for (const wind of idealWinds) {
      const weather = createWeatherData({ windSpeed: wind });
      const score = calculateScoreForHour(weather, preferences);
      expect(score.breakdown.wind).toBe(100);
    }

    // Values above ideal threshold should decay
    const decayingWind = createWeatherData({ windSpeed: 5 });
    const decayScore = calculateScoreForHour(decayingWind, preferences);
    expect(decayScore.breakdown.wind).toBeLessThan(100);
    expect(decayScore.breakdown.wind).toBeGreaterThan(0);
  });

  test("wind above max should be penalized", () => {
    const preferences = {
      ...getDefaultPreferences(),
      wind: { min: 0, max: 15 },
    };

    const testCases = [20, 30, 50];
    for (const wind of testCases) {
      const weather = createWeatherData({ windSpeed: wind });
      const score = calculateScoreForHour(weather, preferences);
      expect(score.breakdown.wind).toBeLessThan(100);
    }
  });

  test("extreme wind should score 0", () => {
    const preferences = {
      ...getDefaultPreferences(),
      wind: { min: 0, max: 10 },
    };

    const extremeWind = createWeatherData({ windSpeed: 100 });
    const score = calculateScoreForHour(extremeWind, preferences);
    expect(score.breakdown.wind).toBe(0);
  });

  test("wind below min should be penalized (for cases where some wind is desired)", () => {
    const preferences = {
      ...getDefaultPreferences(),
      wind: { min: 5, max: 15 },
    };

    const tooCalm = createWeatherData({ windSpeed: 0 });
    const score = calculateScoreForHour(tooCalm, preferences);
    expect(score.breakdown.wind).toBeLessThan(100);
  });
});

describe("Priority weighting system", () => {
  test("parameters with priority 3 (doesn't matter) should not affect overall score", () => {
    const basePrefs: WeatherPreferences = {
      ...getDefaultPreferences(),
      temperature: { min: 70, max: 80 },
      rain: { min: 0, max: 10 },
      wind: { min: 0, max: 10 },
      humidity: { min: 40, max: 60 },
      cloudCover: { min: 0, max: 30 },
      sunlight: { min: 0, max: 100 },
      priorityOrder: {
        temperature: 0 as PrioritySection,
        rain: 0 as PrioritySection,
        wind: 0 as PrioritySection,
        humidity: 0 as PrioritySection,
        cloudCover: 0 as PrioritySection,
        sunlight: 3 as PrioritySection, // Doesn't matter
      },
    };

    // Perfect conditions except terrible sunlight
    const perfectWeather = createWeatherData({
      temperature: 75,
      precipitationChance: 0,
      windSpeed: 0, // Within ideal 20% threshold
      humidity: 50,
      cloudCover: 0, // Within ideal 20% threshold
      sunlight: 0, // Terrible, but should not matter
    });

    const score = calculateScoreForHour(perfectWeather, basePrefs);

    // Overall score should still be 100 despite terrible sunlight
    // because sunlight has priority 3 (doesn't matter)
    expect(score.score).toBe(100);
  });

  test("highest priority (0) parameters should dominate the score", () => {
    const preferences: WeatherPreferences = {
      ...getDefaultPreferences(),
      temperature: { min: 70, max: 80 },
      rain: { min: 0, max: 10 },
      wind: { min: 0, max: 10 },
      humidity: { min: 40, max: 60 },
      cloudCover: { min: 0, max: 30 },
      sunlight: { min: 0, max: 100 },
      priorityOrder: {
        temperature: 0 as PrioritySection, // Highest
        rain: 3 as PrioritySection, // Doesn't matter
        wind: 3 as PrioritySection,
        humidity: 3 as PrioritySection,
        cloudCover: 3 as PrioritySection,
        sunlight: 3 as PrioritySection,
      },
    };

    // Temperature is perfect, everything else is terrible
    const mixedWeather = createWeatherData({
      temperature: 75, // Perfect
      precipitationChance: 100, // Terrible
      windSpeed: 100, // Terrible
      humidity: 100, // Terrible
      cloudCover: 100, // Terrible
      sunlight: 0, // Terrible
    });

    const score = calculateScoreForHour(mixedWeather, preferences);

    // Score should be 100 because only temperature matters
    expect(score.score).toBe(100);
  });

  test("when all parameters have equal priority, all should contribute equally", () => {
    const preferences: WeatherPreferences = {
      ...getDefaultPreferences(),
      temperature: { min: 70, max: 80 },
      rain: { min: 0, max: 10 },
      wind: { min: 0, max: 10 },
      humidity: { min: 40, max: 60 },
      cloudCover: { min: 0, max: 30 },
      sunlight: { min: 50, max: 100 },
      priorityOrder: {
        temperature: 1 as PrioritySection,
        rain: 1 as PrioritySection,
        wind: 1 as PrioritySection,
        humidity: 1 as PrioritySection,
        cloudCover: 1 as PrioritySection,
        sunlight: 1 as PrioritySection,
      },
    };

    // 5 parameters perfect, 1 parameter at 0
    const mixedWeather = createWeatherData({
      temperature: 75, // 100
      precipitationChance: 0, // 100 (within ideal threshold)
      windSpeed: 2, // 100 (within ideal 20% threshold of 0-10 range)
      humidity: 50, // 100
      cloudCover: 0, // 100 (within ideal threshold)
      sunlight: 0, // 0 with min=50, max=100 - far below range
    });

    const score = calculateScoreForHour(mixedWeather, preferences);

    // With equal weights, average of (100+100+100+100+100+0)/6 ≈ 83
    expect(score.score).toBeCloseTo(83, 0);
  });

  test("different priority levels should produce different weights", () => {
    const highPriorityPrefs: WeatherPreferences = {
      ...getDefaultPreferences(),
      temperature: { min: 70, max: 80 },
      rain: { min: 0, max: 10 },
      priorityOrder: {
        temperature: 0 as PrioritySection, // Highest (2.0x)
        rain: 1 as PrioritySection, // High (1.0x)
        wind: 3 as PrioritySection,
        humidity: 3 as PrioritySection,
        cloudCover: 3 as PrioritySection,
        sunlight: 3 as PrioritySection,
      },
    };

    // Temperature is 0, rain is 100
    const weather = createWeatherData({
      temperature: 100, // Way too hot, score = 0
      precipitationChance: 0, // Perfect, score = 100
    });

    const score = calculateScoreForHour(weather, highPriorityPrefs);

    // With weights 2.0 and 1.0: (0*2.0 + 100*1.0) / (2.0+1.0) = 100/3 ≈ 33
    expect(score.score).toBeCloseTo(33, 0);
  });
});

describe("calculateScoreForHour overall", () => {
  test("perfect conditions should yield perfect score", () => {
    const preferences = getDefaultPreferences();

    const perfectWeather = createWeatherData({
      temperature: 75, // Within 60-90
      humidity: 45, // Within 20-70
      windSpeed: 3, // Within ideal 20% threshold (0-3 of 0-15 range)
      precipitationChance: 0, // Perfect within ideal threshold
      cloudCover: 0, // Perfect within ideal threshold
      sunlight: 80, // Above midpoint of 0-100
    });

    const score = calculateScoreForHour(perfectWeather, preferences);

    expect(score.score).toBe(100);
    expect(score.breakdown.temperature).toBe(100);
    expect(score.breakdown.humidity).toBe(100);
    expect(score.breakdown.wind).toBe(100);
    expect(score.breakdown.rain).toBe(100);
    expect(score.breakdown.cloudCover).toBe(100);
    expect(score.breakdown.sunlight).toBe(100);
  });

  test("terrible conditions should yield very low score", () => {
    const preferences = getDefaultPreferences();

    const terribleWeather = createWeatherData({
      temperature: 0, // Way too cold
      humidity: 100, // Way too humid
      windSpeed: 100, // Way too windy
      precipitationChance: 100, // Heavy rain
      cloudCover: 100, // Completely overcast
      sunlight: 0, // No sun
    });

    const score = calculateScoreForHour(terribleWeather, preferences);

    // Score should be very low or 0
    expect(score.score).toBeLessThan(10);
  });

  test("should include timestamp in result", () => {
    const timestamp = "2024-06-15T14:00:00Z";
    const weather = createWeatherData({ timestamp });
    const score = calculateScoreForHour(weather, getDefaultPreferences());

    expect(score.timestamp).toBe(timestamp);
  });

  test("should include weather data in result", () => {
    const weather = createWeatherData({ temperature: 72, windSpeed: 10 });
    const score = calculateScoreForHour(weather, getDefaultPreferences());

    expect(score.weatherData).toEqual(weather);
  });

  test("should round score to nearest integer", () => {
    const preferences: WeatherPreferences = {
      ...getDefaultPreferences(),
      priorityOrder: {
        temperature: 0 as PrioritySection,
        rain: 0 as PrioritySection,
        wind: 0 as PrioritySection,
        humidity: 3 as PrioritySection,
        cloudCover: 3 as PrioritySection,
        sunlight: 3 as PrioritySection,
      },
    };

    // Create conditions that would yield a non-integer score
    const weather = createWeatherData({
      temperature: 89, // Just below max of 90, should get high but not perfect
      precipitationChance: 0,
      windSpeed: 0,
    });

    const score = calculateScoreForHour(weather, preferences);

    // Score should be an integer
    expect(Number.isInteger(score.score)).toBe(true);
  });

  test("breakdown scores should all be integers", () => {
    const weather = createWeatherData({
      temperature: 85.5,
      humidity: 65.7,
      windSpeed: 12.3,
    });

    const score = calculateScoreForHour(weather, getDefaultPreferences());

    expect(Number.isInteger(score.breakdown.temperature)).toBe(true);
    expect(Number.isInteger(score.breakdown.humidity)).toBe(true);
    expect(Number.isInteger(score.breakdown.wind)).toBe(true);
    expect(Number.isInteger(score.breakdown.rain)).toBe(true);
    expect(Number.isInteger(score.breakdown.cloudCover)).toBe(true);
    expect(Number.isInteger(score.breakdown.sunlight)).toBe(true);
  });
});

describe("calculateAllScores", () => {
  test("should return scores for all periods", () => {
    const periods = [
      createWeatherData({ timestamp: "2024-01-01T09:00:00Z", temperature: 65 }),
      createWeatherData({ timestamp: "2024-01-01T10:00:00Z", temperature: 70 }),
      createWeatherData({ timestamp: "2024-01-01T11:00:00Z", temperature: 75 }),
    ];

    const scores = calculateAllScores(periods, getDefaultPreferences());

    expect(scores).toHaveLength(3);
    expect(scores[0]?.timestamp).toBe("2024-01-01T09:00:00Z");
    expect(scores[1]?.timestamp).toBe("2024-01-01T10:00:00Z");
    expect(scores[2]?.timestamp).toBe("2024-01-01T11:00:00Z");
  });

  test("should maintain order of input periods", () => {
    const periods = [
      createWeatherData({ timestamp: "2024-01-01T15:00:00Z" }),
      createWeatherData({ timestamp: "2024-01-01T12:00:00Z" }),
      createWeatherData({ timestamp: "2024-01-01T18:00:00Z" }),
    ];

    const scores = calculateAllScores(periods, getDefaultPreferences());

    expect(scores[0]?.timestamp).toBe("2024-01-01T15:00:00Z");
    expect(scores[1]?.timestamp).toBe("2024-01-01T12:00:00Z");
    expect(scores[2]?.timestamp).toBe("2024-01-01T18:00:00Z");
  });

  test("should handle empty array", () => {
    const scores = calculateAllScores([], getDefaultPreferences());
    expect(scores).toHaveLength(0);
  });

  test("should handle single period", () => {
    const periods = [createWeatherData({ timestamp: "2024-01-01T12:00:00Z" })];
    const scores = calculateAllScores(periods, getDefaultPreferences());

    expect(scores).toHaveLength(1);
    expect(scores[0]?.timestamp).toBe("2024-01-01T12:00:00Z");
  });

  test("should apply same preferences to all periods", () => {
    const preferences: WeatherPreferences = {
      ...getDefaultPreferences(),
      temperature: { min: 70, max: 80 },
      priorityOrder: {
        temperature: 0 as PrioritySection,
        rain: 3 as PrioritySection,
        wind: 3 as PrioritySection,
        humidity: 3 as PrioritySection,
        cloudCover: 3 as PrioritySection,
        sunlight: 3 as PrioritySection,
      },
    };

    const periods = [
      createWeatherData({ temperature: 75 }), // Perfect
      createWeatherData({ temperature: 50 }), // Too cold
      createWeatherData({ temperature: 100 }), // Too hot
    ];

    const scores = calculateAllScores(periods, preferences);

    expect(scores[0]?.score).toBe(100);
    expect(scores[1]?.score).toBeLessThan(100);
    expect(scores[2]?.score).toBeLessThan(100);
  });
});

describe("calculateScoreStats", () => {
  test("should calculate correct average", () => {
    const scores = [createMockScore(80), createMockScore(90), createMockScore(70)];

    const stats = calculateScoreStats(scores);

    expect(stats.average).toBe(80); // (80+90+70)/3 = 80
  });

  test("should identify best score", () => {
    const scores = [
      createMockScore(80, "2024-01-01T09:00:00Z"),
      createMockScore(95, "2024-01-01T10:00:00Z"),
      createMockScore(70, "2024-01-01T11:00:00Z"),
    ];

    const stats = calculateScoreStats(scores);

    expect(stats.best.score).toBe(95);
    expect(stats.best.timestamp).toBe("2024-01-01T10:00:00Z");
    expect(stats.best.index).toBe(1);
  });

  test("should identify worst score", () => {
    const scores = [
      createMockScore(80, "2024-01-01T09:00:00Z"),
      createMockScore(95, "2024-01-01T10:00:00Z"),
      createMockScore(55, "2024-01-01T11:00:00Z"),
    ];

    const stats = calculateScoreStats(scores);

    expect(stats.worst.score).toBe(55);
    expect(stats.worst.timestamp).toBe("2024-01-01T11:00:00Z");
    expect(stats.worst.index).toBe(2);
  });

  test("should handle empty array", () => {
    const stats = calculateScoreStats([]);

    expect(stats.average).toBe(0);
    expect(stats.best.score).toBe(0);
    expect(stats.worst.score).toBe(0);
  });

  test("should handle single score", () => {
    const scores = [createMockScore(75, "2024-01-01T12:00:00Z")];

    const stats = calculateScoreStats(scores);

    expect(stats.average).toBe(75);
    expect(stats.best.score).toBe(75);
    expect(stats.worst.score).toBe(75);
    expect(stats.best.index).toBe(0);
    expect(stats.worst.index).toBe(0);
  });

  test("should handle all same scores", () => {
    const scores = [createMockScore(80), createMockScore(80), createMockScore(80)];

    const stats = calculateScoreStats(scores);

    expect(stats.average).toBe(80);
    expect(stats.best.score).toBe(80);
    expect(stats.worst.score).toBe(80);
  });

  test("should round average to nearest integer", () => {
    const scores = [createMockScore(80), createMockScore(85), createMockScore(90)];

    const stats = calculateScoreStats(scores);

    // (80+85+90)/3 = 85
    expect(stats.average).toBe(85);
    expect(Number.isInteger(stats.average)).toBe(true);
  });

  test("should handle best score appearing multiple times (return first)", () => {
    const scores = [
      createMockScore(90, "2024-01-01T09:00:00Z"),
      createMockScore(90, "2024-01-01T10:00:00Z"),
      createMockScore(80, "2024-01-01T11:00:00Z"),
    ];

    const stats = calculateScoreStats(scores);

    expect(stats.best.score).toBe(90);
    expect(stats.best.index).toBe(0); // Should return first occurrence
  });

  test("should handle worst score appearing multiple times (return first)", () => {
    const scores = [
      createMockScore(90, "2024-01-01T09:00:00Z"),
      createMockScore(70, "2024-01-01T10:00:00Z"),
      createMockScore(70, "2024-01-01T11:00:00Z"),
    ];

    const stats = calculateScoreStats(scores);

    expect(stats.worst.score).toBe(70);
    expect(stats.worst.index).toBe(1); // Should return first occurrence
  });
});
