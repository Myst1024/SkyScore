import { AlertCircle, Cloud } from "lucide-react";
import { useEffect, useState } from "react";
import { ForecastChart } from "./components/ForecastChart";
import { ForecastSummary } from "./components/ForecastSummary";
import { LocationInput } from "./components/LocationInput";
import { PreferencesPriorityForm } from "./components/PreferencesPriorityForm";
import { isValidUSLocation } from "./lib/geocoding-utils";
import { getForecastForLocation } from "./lib/noaa-service";
import { calculateAllScores, getDefaultPreferences } from "./lib/scoring-algorithm";
import type { ForecastData, Location, SkyScore, WeatherPreferences } from "./lib/types";
import "./index.css";

export function App() {
  const [location, setLocation] = useState<Location | null>(null);
  const [preferences, setPreferences] = useState<WeatherPreferences>(getDefaultPreferences());
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [scores, setScores] = useState<SkyScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch forecast when location changes
  const handleLocationChange = async (newLocation: Location) => {
    setError(null);
    setLoading(true);
    setLocation(newLocation);

    try {
      // Validate location is within NOAA coverage area
      if (!isValidUSLocation(newLocation.lat, newLocation.lon)) {
        throw new Error(
          "Location must be within the United States or territories. NOAA only provides forecasts for US locations.",
        );
      }

      // Fetch forecast data
      const forecast = await getForecastForLocation(
        newLocation.lat,
        newLocation.lon,
        undefined,
        undefined,
      );

      setForecastData(forecast);

      // Calculate initial scores
      const calculatedScores = calculateAllScores(forecast.periods, preferences);
      setScores(calculatedScores);
    } catch (err) {
      const errorMessage =
        err && typeof err === "object" && "message" in err
          ? String(err.message)
          : "Failed to fetch weather data. Please try again.";
      setError(errorMessage);
      setForecastData(null);
      setScores([]);
    } finally {
      setLoading(false);
    }
  };

  // Recalculate scores when preferences change
  useEffect(() => {
    if (forecastData) {
      const calculatedScores = calculateAllScores(forecastData.periods, preferences);
      setScores(calculatedScores);
    }
  }, [preferences, forecastData]);

  const locationName = forecastData
    ? `${forecastData.location.city}, ${forecastData.location.state}`
    : location?.zipCode
      ? `Zip ${location.zipCode}`
      : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-background dark:from-sky-950 dark:to-background">
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 py-6">
          <div className="flex items-center justify-center gap-3">
            <Cloud className="h-12 w-12 text-sky-500" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
              Sky Score
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover how perfectly the weather matches your preferences over the next 5 days
          </p>
        </div>

        {/* Location Input */}
        <LocationInput onLocationChange={handleLocationChange} isLoading={loading} />

        {/* Error Display */}
        {error && (
          <div className="rounded-lg bg-destructive/15 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">Error Loading Forecast</h3>
              <p className="text-sm text-destructive/90 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading forecast data...</p>
          </div>
        )}

        {/* Main Content - Only show when we have data */}
        {!loading && forecastData && scores.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Preferences */}
            <div className="lg:col-span-1">
              <PreferencesPriorityForm
                preferences={preferences}
                onPreferencesChange={setPreferences}
              />
            </div>

            {/* Right Column - Chart and Summary */}
            <div className="lg:col-span-2 space-y-6">
              <ForecastChart
                scores={scores}
                locationName={locationName}
                preferences={preferences}
              />
              <ForecastSummary scores={scores} />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !forecastData && !error && (
          <div className="text-center py-12 space-y-4">
            <Cloud className="h-24 w-24 mx-auto text-muted-foreground/20" />
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-muted-foreground">
                Ready to Check Your Sky Score?
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Enter your location above to see how well the weather matches your ideal conditions
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8 border-t">
          <p>Weather data provided by NOAA National Weather Service</p>
        </div>
      </div>
    </div>
  );
}

export default App;
