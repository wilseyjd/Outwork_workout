import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { BarChart3, TrendingUp, Timer, Weight, Dumbbell } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Exercise } from "@shared/schema";

interface AnalyticsData {
  date: string;
  maxWeight: number | null;
  totalEffort: number | null;
  bestTime: number | null;
  totalSets: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  trend 
}: { 
  title: string; 
  value: string; 
  subtitle?: string; 
  icon: typeof Weight;
  trend?: "up" | "down" | null;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </Card>
  );
}

function ProgressChart({ data, metric }: { data: AnalyticsData[]; metric: "weight" | "effort" | "time" }) {
  if (data.length === 0) return null;

  const getValue = (d: AnalyticsData) => {
    switch (metric) {
      case "weight": return d.maxWeight || 0;
      case "effort": return d.totalEffort || 0;
      case "time": return d.bestTime || 0;
    }
  };

  const values = data.map(getValue);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values);

  return (
    <Card className="p-4">
      <h3 className="font-medium mb-4">
        {metric === "weight" ? "Max Weight" : metric === "effort" ? "Total Effort" : "Best Time"} Over Time
      </h3>
      <div className="space-y-2">
        {data.slice(-10).map((d, i) => {
          const value = getValue(d);
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          return (
            <div key={d.date} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-16 flex-shrink-0">
                {format(parseISO(d.date), "MMM d")}
              </span>
              <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-md transition-all"
                  style={{ width: `${Math.max(percentage, 5)}%` }}
                />
              </div>
              <span className="text-sm font-medium w-16 text-right">
                {metric === "time" ? formatTime(value) : metric === "effort" ? value.toLocaleString() : `${value} lbs`}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function Analytics() {
  const [selectedExercise, setSelectedExercise] = useState<string>("");

  const { data: exercises, isLoading: exercisesLoading } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises"],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData[]>({
    queryKey: [`/api/analytics/exercise/${selectedExercise}`],
    enabled: !!selectedExercise,
  });

  const hasWeightData = analytics?.some(d => d.maxWeight !== null && d.maxWeight > 0);
  const hasTimeData = analytics?.some(d => d.bestTime !== null && d.bestTime > 0);
  const hasEffortData = analytics?.some(d => d.totalEffort !== null && d.totalEffort > 0);

  const latestMaxWeight = analytics?.length ? analytics[analytics.length - 1].maxWeight : null;
  const allTimeMaxWeight = analytics?.reduce((max, d) => Math.max(max, d.maxWeight || 0), 0) || null;
  const latestEffort = analytics?.length ? analytics[analytics.length - 1].totalEffort : null;
  const bestTime = analytics?.reduce((best, d) => {
    if (d.bestTime === null) return best;
    return best === null ? d.bestTime : Math.min(best, d.bestTime);
  }, null as number | null);
  const totalSessions = analytics?.length || 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your exercise progress over time</p>
        </div>

        <div className="space-y-4">
          <Select value={selectedExercise} onValueChange={setSelectedExercise}>
            <SelectTrigger data-testid="select-exercise">
              <SelectValue placeholder="Select an exercise" />
            </SelectTrigger>
            <SelectContent>
              {exercisesLoading ? (
                <div className="p-2 text-sm text-muted-foreground">Loading...</div>
              ) : exercises && exercises.length > 0 ? (
                exercises.map((exercise) => (
                  <SelectItem key={exercise.id} value={exercise.id} data-testid={`option-exercise-${exercise.id}`}>
                    {exercise.name}
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-sm text-muted-foreground">No exercises found</div>
              )}
            </SelectContent>
          </Select>
        </div>

        {!selectedExercise ? (
          <EmptyState
            icon={BarChart3}
            title="Select an exercise"
            description="Choose an exercise above to view your performance analytics"
          />
        ) : analyticsLoading ? (
          <ListSkeleton count={4} />
        ) : !analytics || analytics.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No data yet"
            description="Complete some workouts with this exercise to see analytics"
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {hasWeightData && (
                <>
                  <MetricCard
                    title="All-Time Max"
                    value={`${allTimeMaxWeight} lbs`}
                    icon={Weight}
                  />
                  <MetricCard
                    title="Latest Max"
                    value={latestMaxWeight ? `${latestMaxWeight} lbs` : "—"}
                    icon={Dumbbell}
                  />
                </>
              )}
              {hasTimeData && (
                <MetricCard
                  title="Best Time"
                  value={bestTime ? formatTime(bestTime) : "—"}
                  icon={Timer}
                />
              )}
              {hasEffortData && (
                <MetricCard
                  title="Latest Effort"
                  value={latestEffort ? latestEffort.toLocaleString() : "—"}
                  subtitle="reps × weight"
                  icon={TrendingUp}
                />
              )}
              <MetricCard
                title="Sessions"
                value={totalSessions.toString()}
                subtitle="workouts logged"
                icon={BarChart3}
              />
            </div>

            {hasWeightData && (
              <ProgressChart data={analytics} metric="weight" />
            )}

            {hasEffortData && (
              <ProgressChart data={analytics} metric="effort" />
            )}

            {hasTimeData && (
              <ProgressChart data={analytics} metric="time" />
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
