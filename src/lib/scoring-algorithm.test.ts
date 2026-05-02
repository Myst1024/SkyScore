import { describe, expect, test } from "bun:test";
import { calculateScoreForHour, getDefaultPreferences } from "./scoring-algorithm";
import type { HourlyWeatherData, PrioritySection } from "./types";

describe("calculateSunlightScore", () => {
  // Helper to create minimal weather data for testing
  function createWeatherData(sunlight: number): HourlyWeatherData {
    return {
      timestamp: "2024-01-01T12:00:00Z",
      temperature: 70,
      humidity: 50,
      windSpeed: 5,
      precipitationChance: 0,
      cloudCover: 20,
      sunlight,
      isDaytime: true,
    };
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
        const weather = createWeatherData(sunlight);
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
        const weather = createWeatherData(sunlight);
        const score = calculateScoreForHour(weather, preferences);
        expect(score.breakdown.sunlight).toBe(100);
      }
    });

    test("values below min should score worse than or equal to values at min", () => {
      const preferences = {
        ...getDefaultPreferences(),
        sunlight: { min: 35, max: 100 },
      };

      const belowMin = createWeatherData(29);
      const atMin = createWeatherData(35);

      const scoreBelowMin = calculateScoreForHour(belowMin, preferences);
      const scoreAtMin = calculateScoreForHour(atMin, preferences);

      expect(scoreBelowMin.breakdown.sunlight).toBeLessThanOrEqual(scoreAtMin.breakdown.sunlight);
    });

    test("values between min and midpoint should scale linearly from 0 to 100", () => {
      const preferences = {
        ...getDefaultPreferences(),
        sunlight: { min: 35, max: 100 },
      };

      const atMin = createWeatherData(35); // Should be 0
      const atMidpoint = createWeatherData(67.5); // Should be 100
      const inMiddle = createWeatherData(51.25); // Halfway between min and midpoint, should be ~50

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

      const score17 = calculateScoreForHour(createWeatherData(17), preferences);
      const score29 = calculateScoreForHour(createWeatherData(29), preferences);
      const score41 = calculateScoreForHour(createWeatherData(41), preferences);

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
        const weather = createWeatherData(sunlight);
        const score = calculateScoreForHour(weather, preferences);
        expect(score.breakdown.sunlight).toBe(100);
      }
    });

    test("values outside range should get penalized", () => {
      const preferences = {
        ...getDefaultPreferences(),
        sunlight: { min: 35, max: 70 },
      };

      const belowRange = createWeatherData(20);
      const aboveRange = createWeatherData(85);

      const scoreBelowRange = calculateScoreForHour(belowRange, preferences);
      const scoreAboveRange = calculateScoreForHour(aboveRange, preferences);

      expect(scoreBelowRange.breakdown.sunlight).toBeLessThan(100);
      expect(scoreAboveRange.breakdown.sunlight).toBeLessThan(100);
    });
  });
});
