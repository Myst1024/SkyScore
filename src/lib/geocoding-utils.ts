import zipcodes from "zipcodes";
import type { APIError, Location } from "./types";

/**
 * Convert zip code to coordinates using zipcodes library
 */
export function getCoordinatesFromZipCode(zipCode: string): Location | null {
  const cleaned = zipCode.trim();

  // Validate zip code format (5 digits or 5+4 format)
  if (!/^\d{5}(-\d{4})?$/.test(cleaned)) {
    return null;
  }

  // Look up zip code
  const zipData = zipcodes.lookup(cleaned);

  if (!zipData) {
    return null;
  }

  return {
    lat: zipData.latitude,
    lon: zipData.longitude,
    source: "zip",
    zipCode: cleaned,
  };
}

/**
 * Get location from browser geolocation API
 */
export async function getLocationFromBrowser(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      const error: APIError = {
        message: "Geolocation is not supported by your browser",
        code: "GEOLOCATION_NOT_SUPPORTED",
      };
      reject(error);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          source: "geolocation",
        });
      },
      (error) => {
        const apiError: APIError = {
          message: getGeolocationErrorMessage(error.code),
          code: "GEOLOCATION_ERROR",
          details: error,
        };
        reject(apiError);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      },
    );
  });
}

/**
 * Get user-friendly error message for geolocation errors
 */
function getGeolocationErrorMessage(code: number): string {
  switch (code) {
    case 1: // PERMISSION_DENIED
      return "Location permission denied. Please enable location access in your browser settings.";
    case 2: // POSITION_UNAVAILABLE
      return "Location information is unavailable. Please try again.";
    case 3: // TIMEOUT
      return "Location request timed out. Please try again.";
    default:
      return "An unknown error occurred while getting your location.";
  }
}

/**
 * Validate if coordinates are within US bounds (NOAA coverage area)
 */
export function isValidUSLocation(lat: number, lon: number): boolean {
  // Continental US, Alaska, Hawaii, and territories approximate bounds
  const isInContinentalUS = lat >= 24.5 && lat <= 49.5 && lon >= -125 && lon <= -66;
  const isInAlaska = lat >= 51 && lat <= 72 && lon >= -180 && lon <= -130;
  const isInHawaii = lat >= 18.5 && lat <= 22.5 && lon >= -161 && lon <= -154;
  const isInPuertoRico = lat >= 17.5 && lat <= 18.5 && lon >= -67.5 && lon <= -65;

  return isInContinentalUS || isInAlaska || isInHawaii || isInPuertoRico;
}
