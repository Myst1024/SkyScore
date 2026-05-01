import { BarChart3, Calendar, TrendingDown, TrendingUp } from "lucide-react";
import { formatTooltipTime, getScoreColor, getScoreDescription } from "@/lib/chart-utils";
import { calculateScoreStats, getScoresByDay } from "@/lib/scoring-algorithm";
import type { SkyScore } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface ForecastSummaryProps {
  scores: SkyScore[];
}

export function ForecastSummary({ scores }: ForecastSummaryProps) {
  if (scores.length === 0) {
    return null;
  }

  const stats = calculateScoreStats(scores);
  const dailyStats = getScoresByDay(scores);

  return (
    <div className="space-y-6">
      {/* Overall Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: getScoreColor(stats.average) }}>
              {stats.average}/100
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {getScoreDescription(stats.average)} overall
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: getScoreColor(stats.best.score) }}>
              {stats.best.score}/100
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatTooltipTime(stats.best.timestamp)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Worst Time</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: getScoreColor(stats.worst.score) }}>
              {stats.worst.score}/100
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatTooltipTime(stats.worst.timestamp)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Breakdown
          </CardTitle>
          <CardDescription>Sky Score range for each day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dailyStats.map((day) => (
              <div key={day.date} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{day.date}</span>
                  <span className="text-sm text-muted-foreground">{day.count} hours</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${day.average}%`,
                        backgroundColor: getScoreColor(day.average),
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs min-w-[120px]">
                    <span className="font-medium" style={{ color: getScoreColor(day.average) }}>
                      Avg: {day.average}
                    </span>
                    <span className="text-muted-foreground">
                      ({day.min}-{day.max})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Score Distribution Info */}
      <Card>
        <CardHeader>
          <CardTitle>Understanding Your Sky Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Your Sky Score is calculated based on how well the forecasted weather matches your
            preferences. Parameters are weighted by which priority section you place them in:
          </p>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start gap-2">
              <span className="font-semibold min-w-[140px]">Highest Priority:</span>
              <span className="text-muted-foreground">2.0x weight</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold min-w-[140px]">High Priority:</span>
              <span className="text-muted-foreground">1.0x weight</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold min-w-[140px]">Medium Priority:</span>
              <span className="text-muted-foreground">0.4x weight</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold min-w-[140px]">Doesn't Matter:</span>
              <span className="text-muted-foreground">0x weight (no impact)</span>
            </li>
          </ul>
          <p className="text-muted-foreground pt-2 border-t">
            <strong>Tip:</strong> Drag parameters between sections to instantly see how your
            priorities affect the forecast score!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
