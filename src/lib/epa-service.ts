import type { APIError } from "./types";

const EPA_BASE_URL = "https://data.epa.gov/dmapservice";

/**
 * EPA UV Index hourly forecast response
 */
export interface EPAUVHourlyResponse {
  ORDER: number;
  ZIP?: string;
  CITY?: string;
  STATE?: string;
  DATE_TIME: string; // Local time format: "YYYY-MM-DD HH:MM:SS"
  UV_VALUE: number;
}

/**
 * Get hourly UV index forecast by ZIP code
 */
export async function getUVIndexByZipCode(zipCode: string): Promise<EPAUVHourlyResponse[]> {
  const url = `${EPA_BASE_URL}/getEnvirofactsUVHOURLY/ZIP/${zipCode}/JSON`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`EPA API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    const apiError: APIError = {
      message: "Failed to fetch UV index data from EPA",
      details: error,
    };
    throw apiError;
  }
}

/**
 * Get hourly UV index forecast by city and state
 */
export async function getUVIndexByCityState(
  city: string,
  state: string,
): Promise<EPAUVHourlyResponse[]> {
  // Clean city name for URL (replace spaces with encoded format)
  const cleanCity = city.trim().toLowerCase().replace(/\s+/g, "%20");
  const cleanState = state.trim().toUpperCase();

  const url = `${EPA_BASE_URL}/getEnvirofactsUVHOURLY/CITY/${cleanCity}/STATE/${cleanState}/JSON`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`EPA API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    const apiError: APIError = {
      message: "Failed to fetch UV index data from EPA",
      details: error,
    };
    throw apiError;
  }
}

/**
 * Parse EPA date/time to Date object
 * EPA returns local time in format "May/02/2026 02 AM" or "May/02/2026 02 PM"
 */
export function parseEPADateTime(dateTimeStr: string): Date {
  try {
    // Format: "May/02/2026 02 AM" or "May/02/2026 02 PM"
    const parts = dateTimeStr.trim().split(" ");
    if (parts.length !== 3) {
      console.warn("Unexpected EPA date format:", dateTimeStr);
      return new Date(dateTimeStr);
    }

    const [datePart, hourPart, ampm] = parts;
    if (!datePart || !hourPart || !ampm) {
      return new Date(dateTimeStr);
    }

    // Parse date: "May/02/2026"
    const dateComponents = datePart.split("/");
    if (dateComponents.length !== 3) {
      return new Date(dateTimeStr);
    }

    const [monthStr, dayStr, yearStr] = dateComponents;
    if (!monthStr || !dayStr || !yearStr) {
      return new Date(dateTimeStr);
    }

    // Convert month name to number
    const monthMap: Record<string, number> = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };

    const month = monthMap[monthStr];
    if (month === undefined) {
      return new Date(dateTimeStr);
    }

    const day = parseInt(dayStr, 10);
    const year = parseInt(yearStr, 10);
    let hour = parseInt(hourPart, 10);

    // Convert to 24-hour format
    if (ampm.toLowerCase() === "pm" && hour !== 12) {
      hour += 12;
    } else if (ampm.toLowerCase() === "am" && hour === 12) {
      hour = 0;
    }

    // Create date in local time
    return new Date(year, month, day, hour, 0, 0);
  } catch (err) {
    console.warn("Failed to parse EPA date:", dateTimeStr, err);
    return new Date();
  }
}

/**
 * Create a map of timestamps to UV values
 * Uses a fuzzy match (within several hours) to handle timezone differences
 */
export function createUVIndexMap(uvData: EPAUVHourlyResponse[]): Map<string, number> {
  const uvMap = new Map<string, number>();

  for (const dataPoint of uvData) {
    try {
      const epaDate = parseEPADateTime(dataPoint.DATE_TIME);

      // Store UV value with multiple timestamp keys for fuzzy matching
      // EPA returns local time, NOAA returns timestamps with timezone offsets
      // We'll create keys for ±6 hours to handle various timezone scenarios
      for (let offset = -6; offset <= 6; offset++) {
        const adjustedDate = new Date(epaDate);
        adjustedDate.setHours(adjustedDate.getHours() + offset);
        const key = adjustedDate.toISOString().slice(0, 13); // YYYY-MM-DDTHH format
        // Only set if not already set (prefer the closest match)
        if (!uvMap.has(key)) {
          uvMap.set(key, dataPoint.UV_VALUE);
        }
      }
    } catch (err) {
      console.warn("Failed to parse EPA date:", dataPoint.DATE_TIME, err);
    }
  }

  return uvMap;
}

/**
 * Get UV value for a given timestamp from the UV map
 * Uses fuzzy matching to handle timezone differences
 */
export function getUVValueForTimestamp(timestamp: string, uvMap: Map<string, number>): number {
  try {
    const date = new Date(timestamp);
    const key = date.toISOString().slice(0, 13); // YYYY-MM-DDTHH format
    const uvValue = uvMap.get(key);

    if (uvValue === undefined) {
      return 5; // Default to moderate UV if not found
    }

    return uvValue;
  } catch (err) {
    console.warn("Failed to get UV value for timestamp:", timestamp, err);
    return 5; // Default to moderate UV
  }
}
