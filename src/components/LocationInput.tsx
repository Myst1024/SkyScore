import { Loader2, MapPin } from "lucide-react";
import { useState } from "react";
import { getCoordinatesFromZipCode, getLocationFromBrowser } from "@/lib/geocoding-utils";
import type { Location } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface LocationInputProps {
  onLocationChange: (location: Location) => void;
  isLoading?: boolean;
}

export function LocationInput({ onLocationChange, isLoading = false }: LocationInputProps) {
  const [zipCode, setZipCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const handleZipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!zipCode.trim()) {
      setError("Please enter a zip code");
      return;
    }

    const location = getCoordinatesFromZipCode(zipCode);

    if (!location) {
      setError("Invalid zip code. Please enter a valid 5-digit US zip code.");
      return;
    }

    onLocationChange(location);
  };

  const handleUseMyLocation = async () => {
    setError(null);
    setGeoLoading(true);

    try {
      const location = await getLocationFromBrowser();
      onLocationChange(location);
    } catch (err) {
      const errorMessage =
        err && typeof err === "object" && "message" in err
          ? String(err.message)
          : "Failed to get your location";
      setError(errorMessage);
    } finally {
      setGeoLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enter Your Location</CardTitle>
        <CardDescription>
          Enter a zip code or use your current location to see your Sky Score forecast
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <form onSubmit={handleZipSubmit} className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="zipcode" className="sr-only">
                  Zip Code
                </Label>
                <Input
                  id="zipcode"
                  type="text"
                  placeholder="Enter zip code (e.g., 90210)"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  disabled={isLoading || geoLoading}
                  maxLength={10}
                  className="w-full"
                />
              </div>
              <Button type="submit" disabled={isLoading || geoLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Get Forecast"
                )}
              </Button>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleUseMyLocation}
            disabled={isLoading || geoLoading}
          >
            {geoLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Getting location...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Use My Location
              </>
            )}
          </Button>

          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
