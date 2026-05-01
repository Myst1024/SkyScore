import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { formatTooltipTime, getScoreColor, getScoreDescription } from "@/lib/chart-utils";
import { calculateScoreStats } from "@/lib/scoring-algorithm";
import type { SkyScore } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface ForecastSummaryProps {
  scores: SkyScore[];
}

export function ForecastSummary({ scores }: ForecastSummaryProps) {
  if (scores.length === 0) {
    return null;
  }

  const stats = calculateScoreStats(scores);

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
