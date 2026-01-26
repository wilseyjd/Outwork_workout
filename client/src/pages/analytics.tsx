import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, TrendingUp, Timer, Weight, Dumbbell } from "lucide-react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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

  const chartData = data.slice(-20).map(d => ({
    date: format(parseISO(d.date), "MMM d"),
    value: metric === "weight" ? (d.maxWeight || 0) : 
           metric === "effort" ? (d.totalEffort || 0) : 
           (d.bestTime || 0),
    rawValue: metric === "weight" ? d.maxWeight : 
              metric === "effort" ? d.totalEffort : 
              d.bestTime,
  })).filter(d => d.value > 0);

  if (chartData.length === 0) return null;

  const title = metric === "weight" ? "Max Weight" : 
                metric === "effort" ? "Total Effort" : 
                "Best Time";
  
  const unit = metric === "weight" ? " lbs" : 
               metric === "effort" ? "" : 
               "s";

  const formatTooltip = (value: number) => {
    if (metric === "time") return formatTime(value);
    if (metric === "effort") return value.toLocaleString();
    return `${value} lbs`;
  };

  return (
    <Card className="p-4">
      <h3 className="font-medium mb-4">{title} Over Time</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }} 
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }} 
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
              width={50}
              tickFormatter={(val) => metric === "time" ? `${val}s` : val.toLocaleString()}
            />
            <Tooltip 
              formatter={(value: number) => [formatTooltip(value), title]}
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "14px"
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
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
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/history" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">Track your exercise progress over time</p>
          </div>
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
