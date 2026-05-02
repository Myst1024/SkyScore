import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatDayLabel,
  formatTooltipTime,
  getMidnightFiveDaysLater,
  getScoreColor,
  getScoreDescription,
} from "@/lib/chart-utils";
import type { SkyScore, WeatherParameter, WeatherPreferences } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface ForecastChartProps {
  scores: SkyScore[];
  preferences?: WeatherPreferences;
}

interface ChartDataPoint {
  index: number;
  score: number;
  timestamp: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitationChance: number;
  cloudCover: number;
  sunlight: number;
  isDaytime: boolean;
  shortForecast?: string;
  // Individual parameter scores
  temperatureScore: number;
  humidityScore: number;
  windScore: number;
  rainScore: number;
  cloudCoverScore: number;
  sunlightScore: number;
}

interface ParameterConfig {
  key: WeatherParameter;
  dataKey: string;
  label: string;
  color: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}

function getScoreImpactColor(score: number): string {
  if (score >= 80) return "hsl(120, 70%, 40%)"; // Green - positive impact
  if (score >= 60) return "hsl(45, 70%, 45%)"; // Yellow - neutral/good
  if (score >= 40) return "hsl(30, 70%, 50%)"; // Orange - moderate negative
  return "hsl(0, 70%, 50%)"; // Red - strong negative impact
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0]!.payload as ChartDataPoint;

  return (
    <div
      className="bg-background border border-border rounded-lg shadow-lg p-3 space-y-2"
      style={{ opacity: 0.9 }}
    >
      <div className="font-semibold text-sm border-b pb-2">{formatTooltipTime(data.timestamp)}</div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="font-bold text-base" style={{ color: getScoreColor(data.score) }}>
            Sky Score: {data.score}/100
          </span>
          <span className="text-muted-foreground">({getScoreDescription(data.score)})</span>
        </div>
        {data.shortForecast && (
          <div className="text-muted-foreground italic">{data.shortForecast}</div>
        )}
        <div className="pt-2 space-y-1 border-t">
          <div className="flex justify-between items-center">
            <span>Temperature:</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{data.temperature}°F</span>
              <span
                className="font-bold text-[10px]"
                style={{ color: getScoreImpactColor(data.temperatureScore) }}
              >
                ({data.temperatureScore})
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span>Humidity:</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{data.humidity}%</span>
              <span
                className="font-bold text-[10px]"
                style={{ color: getScoreImpactColor(data.humidityScore) }}
              >
                ({data.humidityScore})
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span>Wind:</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{data.windSpeed} mph</span>
              <span
                className="font-bold text-[10px]"
                style={{ color: getScoreImpactColor(data.windScore) }}
              >
                ({data.windScore})
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span>Rain Chance:</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{data.precipitationChance}%</span>
              <span
                className="font-bold text-[10px]"
                style={{ color: getScoreImpactColor(data.rainScore) }}
              >
                ({data.rainScore})
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span>Cloud Cover:</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{data.cloudCover}%</span>
              <span
                className="font-bold text-[10px]"
                style={{ color: getScoreImpactColor(data.cloudCoverScore) }}
              >
                ({data.cloudCoverScore})
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span>Sunlight:</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{data.sunlight}/100</span>
              <span
                className="font-bold text-[10px]"
                style={{ color: getScoreImpactColor(data.sunlightScore) }}
              >
                ({data.sunlightScore})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ForecastChart({ scores, preferences }: ForecastChartProps) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);

  if (scores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sky Score Forecast</CardTitle>
          <CardDescription>No forecast data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Enter a location to see your forecast
          </div>
        </CardContent>
      </Card>
    );
  }

  // Define parameter configurations with colors
  const parameterConfigs: ParameterConfig[] = [
    {
      key: "temperature",
      dataKey: "temperatureScore",
      label: "Temperature",
      color: "hsl(0, 70%, 50%)",
    },
    { key: "humidity", dataKey: "humidityScore", label: "Humidity", color: "hsl(200, 70%, 50%)" },
    { key: "wind", dataKey: "windScore", label: "Wind", color: "hsl(160, 70%, 50%)" },
    { key: "rain", dataKey: "rainScore", label: "Rain", color: "hsl(240, 70%, 50%)" },
    {
      key: "cloudCover",
      dataKey: "cloudCoverScore",
      label: "Cloud Cover",
      color: "hsl(280, 70%, 50%)",
    },
    {
      key: "sunlight",
      dataKey: "sunlightScore",
      label: "Sunlight",
      color: "hsl(45, 90%, 55%)",
    },
  ];

  // Filter parameters based on priority (exclude priority 3 = "Doesn't Matter")
  const activeParameters = preferences
    ? parameterConfigs.filter((param) => preferences.priorityOrder[param.key] !== 3)
    : [];

  // Filter data: start from now (or next forecast) and end at midnight 5 days from now
  const now = new Date();
  const endTime = getMidnightFiveDaysLater(now);

  const filteredScores = scores.filter((score) => {
    const scoreTime = new Date(score.timestamp);
    return scoreTime >= now && scoreTime <= endTime;
  });

  // If all scores are in the past, show the last available data
  const displayScores = filteredScores.length > 0 ? filteredScores : scores.slice(-48);

  // Transform data for the chart
  const chartData: ChartDataPoint[] = displayScores.map((score, index) => ({
    index,
    score: score.score,
    timestamp: score.timestamp,
    temperature: score.weatherData.temperature,
    humidity: score.weatherData.humidity,
    windSpeed: score.weatherData.windSpeed,
    precipitationChance: score.weatherData.precipitationChance,
    cloudCover: score.weatherData.cloudCover,
    sunlight: score.weatherData.sunlight,
    isDaytime: score.weatherData.isDaytime,
    shortForecast: score.weatherData.shortForecast,
    // Add individual parameter scores
    temperatureScore: score.breakdown.temperature,
    humidityScore: score.breakdown.humidity,
    windScore: score.breakdown.wind,
    rainScore: score.breakdown.rain,
    cloudCoverScore: score.breakdown.cloudCover,
    sunlightScore: score.breakdown.sunlight,
  }));

  // Find day boundaries (midnight points) for vertical separators
  const dayBoundaries: Array<{ index: number; label: string }> = [];
  chartData.forEach((point, index) => {
    const date = new Date(point.timestamp);
    if (date.getHours() === 0) {
      dayBoundaries.push({
        index,
        label: formatDayLabel(point.timestamp),
      });
    }
  });

  // Get tick positions: show ticks at every day boundary
  const ticks: number[] = dayBoundaries.map((b) => b.index);

  // If no day boundaries yet (first day), add first index
  if (ticks.length === 0 && chartData.length > 0) {
    ticks.push(0);
  }

  // Find nighttime periods for shading
  const nighttimePeriods: Array<{ start: number; end: number }> = [];
  let nightStart: number | null = null;

  chartData.forEach((point, index) => {
    if (!point.isDaytime && nightStart === null) {
      // Start of nighttime period
      nightStart = index;
    } else if (point.isDaytime && nightStart !== null) {
      // End of nighttime period
      nighttimePeriods.push({ start: nightStart, end: index - 1 });
      nightStart = null;
    }
  });

  // If still in nighttime at the end, close the period
  if (nightStart !== null) {
    nighttimePeriods.push({ start: nightStart, end: chartData.length - 1 });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sky Score Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="index"
              ticks={ticks}
              tickFormatter={(index) => {
                const item = chartData[index];
                return item ? formatDayLabel(item.timestamp) : "";
              }}
              tick={{ fontSize: 12 }}
            />
            <YAxis domain={[0, 100]} ticks={[20, 40, 60, 80]} width={30} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} offset={{ x: 40, y: -100 }} />

            {/* Nighttime shading */}
            {nighttimePeriods.map((period) => (
              <ReferenceArea
                key={`night-${period.start}-${period.end}`}
                x1={period.start}
                x2={period.end}
                fill="hsl(220, 30%, 20%)"
                fillOpacity={0.15}
                strokeOpacity={0}
              />
            ))}

            {/* Individual parameter lines (partially transparent unless hovered) */}
            {activeParameters.map((param) => (
              <Line
                key={param.dataKey}
                type="monotone"
                dataKey={param.dataKey}
                stroke={param.color}
                strokeWidth={hoveredLine === param.dataKey ? 2.5 : 1.5}
                strokeOpacity={
                  hoveredLine === null ? 0.15 : hoveredLine === param.dataKey ? 0.7 : 0.05
                }
                dot={false}
                activeDot={{ r: 4 }}
                onMouseEnter={() => setHoveredLine(param.dataKey)}
                onMouseLeave={() => setHoveredLine(null)}
              />
            ))}

            {/* Sky Score line (main line, highlighted by default) */}
            <Line
              type="monotone"
              dataKey="score"
              stroke="hsl(210, 100%, 50%)"
              strokeWidth={hoveredLine === null || hoveredLine === "score" ? 3 : 1.5}
              strokeOpacity={1}
              dot={false}
              activeDot={{ r: 6 }}
              onMouseEnter={() => setHoveredLine("score")}
              onMouseLeave={() => setHoveredLine(null)}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Legend */}
        {activeParameters.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-3 text-xs flex-wrap">
            <button
              type="button"
              className="flex items-center gap-2 cursor-pointer"
              onMouseEnter={() => setHoveredLine("score")}
              onMouseLeave={() => setHoveredLine(null)}
            >
              <div
                className="w-8 h-0.5 rounded-full"
                style={{
                  backgroundColor: "hsl(210, 100%, 50%)",
                  opacity: 1,
                }}
              />
              <span className={hoveredLine === "score" ? "font-semibold" : ""}>Sky Score</span>
            </button>
            {activeParameters.map((param) => (
              <button
                key={param.dataKey}
                type="button"
                className="flex items-center gap-2 cursor-pointer"
                onMouseEnter={() => setHoveredLine(param.dataKey)}
                onMouseLeave={() => setHoveredLine(null)}
              >
                <div
                  className="w-8 h-0.5 rounded-full"
                  style={{
                    backgroundColor: param.color,
                    opacity:
                      hoveredLine === null ? 0.15 : hoveredLine === param.dataKey ? 0.7 : 0.05,
                  }}
                />
                <span className={hoveredLine === param.dataKey ? "font-semibold" : ""}>
                  {param.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
