import { createUVIndexMap, getUVIndexByCityState, getUVValueForTimestamp } from "./epa-service";
import type {
  APIError,
  ForecastData,
  HourlyWeatherData,
  NOAAGridDataResponse,
  NOAAHourlyForecastResponse,
  NOAAPointsResponse,
} from "./types";

const USER_AGENT = "(SkyScore.com, contact@skyscore.com)";
const NOAA_BASE_URL = "https://api.weather.gov";

/**
 * Get grid points from latitude and longitude coordinates
 */
export async function getGridPointsFromCoordinates(
  lat: number,
  lon: number,
): Promise<NOAAPointsResponse> {
  const url = `${NOAA_BASE_URL}/points/${lat.toFixed(4)},${lon.toFixed(4)}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`NOAA API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    const apiError: APIError = {
      message: "Failed to fetch grid points from NOAA",
      details: error,
    };
    throw apiError;
  }
}

/**
 * Get hourly forecast data from NOAA forecast URL
 */
export async function getHourlyForecast(forecastUrl: string): Promise<NOAAHourlyForecastResponse> {
  try {
    const response = await fetch(forecastUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`NOAA API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    const apiError: APIError = {
      message: "Failed to fetch hourly forecast from NOAA",
      details: error,
    };
    throw apiError;
  }
}

/**
 * Get grid data from NOAA (includes detailed data like sky cover)
 */
export async function getGridData(gridDataUrl: string): Promise<NOAAGridDataResponse> {
  try {
    const response = await fetch(gridDataUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`NOAA API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    const apiError: APIError = {
      message: "Failed to fetch grid data from NOAA",
      details: error,
    };
    throw apiError;
  }
}

/**
 * Parse ISO8601 interval to get start time and duration
 * Format: "2024-01-01T12:00:00+00:00/PT1H" or "2024-01-01T12:00:00+00:00/PT2H"
 */
function parseValidTime(validTime: string): {
  startTime: Date;
  durationHours: number;
} {
  const parts = validTime.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    // Fallback if format is unexpected
    return { startTime: new Date(validTime), durationHours: 1 };
  }

  const startTimeStr = parts[0];
  const durationStr = parts[1];
  const startTime = new Date(startTimeStr);

  // Parse duration (PT1H = 1 hour, PT2H = 2 hours, etc.)
  const durationMatch = durationStr.match(/PT(\d+)H/);
  const durationHours = durationMatch?.[1] ? parseInt(durationMatch[1], 10) : 1;

  return { startTime, durationHours };
}

/**
 * Create maps of timestamps to weather values from grid data
 * This handles the interval-based data from NOAA grid data
 */
function createGridDataMaps(gridData: NOAAGridDataResponse): {
  skyCover: Map<string, number>;
  windSpeed: Map<string, number>;
} {
  const skyCoverMap = new Map<string, number>();
  const windSpeedMap = new Map<string, number>();

  // Process sky cover data
  if (gridData.properties.skyCover?.values) {
    for (const dataPoint of gridData.properties.skyCover.values) {
      if (dataPoint.value === null) continue;

      const { startTime, durationHours } = parseValidTime(dataPoint.validTime);

      // Fill in all hours covered by this interval
      for (let i = 0; i < durationHours; i++) {
        const timestamp = new Date(startTime);
        timestamp.setHours(timestamp.getHours() + i);
        const isoString = timestamp.toISOString();
        skyCoverMap.set(isoString, dataPoint.value);
      }
    }
  }

  // Process wind speed data
  if (gridData.properties.windSpeed?.values) {
    for (const dataPoint of gridData.properties.windSpeed.values) {
      if (dataPoint.value === null) continue;

      const { startTime, durationHours } = parseValidTime(dataPoint.validTime);

      // Fill in all hours covered by this interval
      for (let i = 0; i < durationHours; i++) {
        const timestamp = new Date(startTime);
        timestamp.setHours(timestamp.getHours() + i);
        const isoString = timestamp.toISOString();
        // Convert from km/h to mph (NOAA grid data returns km/h, we want mph)
        const windSpeedMph = dataPoint.value * 0.621371;
        windSpeedMap.set(isoString, Math.round(windSpeedMph));
      }
    }
  }

  return { skyCover: skyCoverMap, windSpeed: windSpeedMap };
}

/**
 * Parse NOAA hourly forecast data into our HourlyWeatherData format
 * @param forecast - The hourly forecast response from NOAA
 * @param gridMaps - Maps of timestamps to weather values from grid data
 * @param uvMap - Map of timestamps to UV index values from EPA
 */
export function parseWeatherData(
  forecast: NOAAHourlyForecastResponse,
  gridMaps?: { skyCover: Map<string, number>; windSpeed: Map<string, number> },
  uvMap?: Map<string, number>,
): HourlyWeatherData[] {
  return forecast.properties.periods.map((period) => {
    // Convert period timestamp to UTC ISO format to match map keys
    const periodTimeUTC = new Date(period.startTime).toISOString();

    const data: HourlyWeatherData = {
      timestamp: period.startTime,
      temperature: period.temperature,
      humidity: period.relativeHumidity?.value ?? 50,
      windSpeed: gridMaps?.windSpeed.get(periodTimeUTC) ?? 0,
      precipitationChance: period.probabilityOfPrecipitation?.value ?? 0,
      cloudCover: gridMaps?.skyCover.get(periodTimeUTC) ?? 50,
      uvIndex: uvMap ? getUVValueForTimestamp(period.startTime, uvMap) : 5,
      isDaytime: period.isDaytime,
      shortForecast: period.shortForecast,
    };

    return data;
  });
}

/**
 * Get complete forecast data for a location
 * Limits to 5 days (120 hours) as specified in requirements
 */
export async function getForecastForLocation(
  lat: number,
  lon: number,
  city?: string,
  state?: string,
): Promise<ForecastData> {
  try {
    // Step 1: Get grid points
    const pointsData = await getGridPointsFromCoordinates(lat, lon);

    // Try to get city/state from various sources
    const locationCity =
      city ||
      pointsData.properties.city ||
      pointsData.properties.relativeLocation?.properties?.city;
    const locationState =
      state ||
      pointsData.properties.state ||
      pointsData.properties.relativeLocation?.properties?.state;

    // Step 2: Fetch weather data and UV index in parallel
    const [hourlyForecast, gridData, uvData] = await Promise.all([
      getHourlyForecast(pointsData.properties.forecastHourly),
      getGridData(pointsData.properties.forecastGridData),
      // Fetch UV index if we have city and state
      locationCity && locationState
        ? getUVIndexByCityState(locationCity, locationState).catch((err) => {
            console.warn("Failed to fetch UV index data:", err);
            return [];
          })
        : Promise.resolve([]),
    ]);

    // Step 3: Create maps from grid data and UV data
    const gridMaps = createGridDataMaps(gridData);
    const uvMap = uvData.length > 0 ? createUVIndexMap(uvData) : undefined;

    // Step 4: Parse weather data with all data sources
    const allPeriods = parseWeatherData(hourlyForecast, gridMaps, uvMap);

    // Step 5: Limit to 5 days (120 hours)
    const periods = allPeriods.slice(0, 120);

    return {
      location: {
        lat,
        lon,
        city: locationCity,
        state: locationState,
      },
      periods,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    const apiError: APIError = {
      message: "Failed to fetch complete forecast data",
      details: error,
    };
    throw apiError;
  }
}
