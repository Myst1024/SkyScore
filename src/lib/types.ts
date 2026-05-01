// Weather parameter types
export type WeatherParameter = "temperature" | "humidity" | "wind" | "rain" | "cloudCover";

// Priority section (0 = highest, 3 = lowest)
export type PrioritySection = 0 | 1 | 2 | 3;

// Weather preference range
export interface WeatherPreferenceRange {
  min: number;
  max: number;
}

// Weather preference ranges set by user
export interface WeatherPreferences {
  temperature: WeatherPreferenceRange;
  humidity: WeatherPreferenceRange;
  wind: WeatherPreferenceRange;
  rain: WeatherPreferenceRange;
  cloudCover: WeatherPreferenceRange;
  // Priority ordering: which section each parameter belongs to
  priorityOrder: Record<WeatherParameter, PrioritySection>;
  // Visual order within each section
  sectionOrder: Record<PrioritySection, WeatherParameter[]>;
}

// Single hour's weather data from NOAA
export interface HourlyWeatherData {
  timestamp: string; // ISO 8601 timestamp
  temperature: number; // Fahrenheit
  humidity: number; // percentage (0-100)
  windSpeed: number; // mph
  precipitationChance: number; // percentage (0-100)
  cloudCover: number; // percentage (0-100)
  shortForecast?: string; // e.g., "Partly Cloudy"
}

// Full forecast data for multiple days
export interface ForecastData {
  location: {
    lat: number;
    lon: number;
    city?: string;
    state?: string;
  };
  periods: HourlyWeatherData[];
  fetchedAt: string; // ISO 8601 timestamp
}

// Calculated Sky Score for a single hour
export interface SkyScore {
  timestamp: string;
  score: number; // 0-100 (100 = perfect match)
  breakdown: {
    temperature: number;
    humidity: number;
    wind: number;
    rain: number;
    cloudCover: number;
  };
  weatherData: HourlyWeatherData;
}

// Location input from user
export interface Location {
  lat: number;
  lon: number;
  source: "zip" | "geolocation";
  zipCode?: string;
  city?: string;
  state?: string;
}

// NOAA API response types
export interface NOAAPointsResponse {
  properties: {
    gridId: string;
    gridX: number;
    gridY: number;
    forecast: string; // URL to forecast endpoint
    forecastHourly: string; // URL to hourly forecast endpoint
    forecastGridData: string; // URL to grid data endpoint with detailed data
    city?: string;
    state?: string;
    relativeLocation?: {
      properties?: {
        city?: string;
        state?: string;
      };
    };
  };
}

export interface NOAAGridDataValue {
  validTime: string; // ISO8601 interval format (e.g., "2024-01-01T12:00:00+00:00/PT1H")
  value: number | null;
}

export interface NOAAGridDataResponse {
  properties: {
    skyCover?: {
      values: NOAAGridDataValue[];
    };
    windSpeed?: {
      uom: string; // unit of measure (e.g., "wmoUnit:m_s-1")
      values: NOAAGridDataValue[];
    };
  };
}

export interface NOAAForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  shortForecast: string;
  detailedForecast: string;
  probabilityOfPrecipitation?: {
    value: number | null;
  };
  relativeHumidity?: {
    value: number | null;
  };
  dewpoint?: {
    value: number | null;
  };
}

export interface NOAAHourlyForecastResponse {
  properties: {
    periods: NOAAForecastPeriod[];
  };
}

// Error types
export interface APIError {
  message: string;
  code?: string;
  details?: unknown;
}
