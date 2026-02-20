import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ListSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, BarChart3, TrendingUp, TrendingDown, Timer, Weight,
  Dumbbell, Search, X, Flame, Calendar, Pill, Trophy, Clock,
} from "lucide-react";
import { Link } from "wouter";
import { format, parseISO, subDays, startOfDay, differenceInDays } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { Exercise, Supplement, SupplementLog, BodyWeightLog } from "@shared/schema";

// ============================================================
// Types
// ============================================================

interface AnalyticsData {
  date: string;
  maxWeight: number | null;
  totalEffort: number | null;
  bestTime: number | null;
  totalSets: number;
}

interface OverviewData {
  workoutsThisWeek: number;
  workoutsThisMonth: number;
  currentStreak: number;
  avgSessionsPerWeek: number;
  weeklyVolume: { week: string; volume: number }[];
}

interface VolumeData {
  date: string;
  volume: number;
}

interface PrEntry {
  date: string;
  exerciseId: string;
  exerciseName: string;
  metric: "weight" | "time";
  value: number;
}

interface CategoryVolume {
  category: string;
  volume: number;
}

interface SessionDuration {
  date: string;
  durationMin: number;
}

type TimeRange = "1mo" | "3mo" | "6mo" | "1yr" | "all";
type Tab = "training" | "weight" | "supplements";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1yr", label: "1Y" },
  { value: "all", label: "All" },
];

// ============================================================
// Helpers
// ============================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
}

function getRangeSince(range: TimeRange): string | undefined {
  if (range === "all") return undefined;
  const now = new Date();
  const cutoffs: Record<Exclude<TimeRange, "all">, Date> = {
    "1mo": new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
    "3mo": new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
    "6mo": new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
    "1yr": new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
  };
  return cutoffs[range].toISOString();
}

// ============================================================
// Shared UI
// ============================================================

function TimeRangeToggle({ value, onChange }: { value: TimeRange; onChange: (r: TimeRange) => void }) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
      {TIME_RANGES.map(r => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            value === r.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
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
      {trend && (
        <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${trend === "up" ? "text-green-500" : "text-red-500"}`}>
          {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        </div>
      )}
    </Card>
  );
}

function ExerciseSearch({
  exercises,
  isLoading,
  onSelect,
  placeholder = "Search exercises with history...",
  testId = "input-search",
}: {
  exercises: Exercise[] | undefined;
  isLoading: boolean;
  onSelect: (exercise: Exercise) => void;
  placeholder?: string;
  testId?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = exercises?.filter(e =>
    e.name.toLowerCase().includes(query.toLowerCase()) ||
    e.category?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          className="pl-9"
          data-testid={testId}
        />
      </div>
      {open && (
        <div className="rounded-md border border-input bg-background max-h-52 overflow-y-auto mt-1">
          {isLoading ? (
            <div className="p-3 text-sm text-muted-foreground">Loading...</div>
          ) : filtered && filtered.length > 0 ? (
            filtered.map(exercise => (
              <button
                key={exercise.id}
                onClick={() => { onSelect(exercise); setQuery(""); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border last:border-b-0"
                data-testid={`option-exercise-${exercise.id}`}
              >
                <div className="font-medium">{exercise.name}</div>
                {exercise.category && (
                  <div className="text-xs text-muted-foreground">{exercise.category}</div>
                )}
              </button>
            ))
          ) : (
            <div className="p-3 text-sm text-muted-foreground">No exercises with history found</div>
          )}
        </div>
      )}
    </div>
  );
}

const CHART_STYLE = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "14px",
  },
  labelStyle: { color: "hsl(var(--muted-foreground))" },
};

// ============================================================
// Training Tab — Overview
// ============================================================

function OverviewDashboard({ overview }: { overview: OverviewData }) {
  const chartData = overview.weeklyVolume.map(w => ({
    week: format(parseISO(w.week), "MMM d"),
    volume: w.volume,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard title="This Week" value={overview.workoutsThisWeek.toString()} subtitle="workouts" icon={BarChart3} />
        <MetricCard title="This Month" value={overview.workoutsThisMonth.toString()} subtitle="workouts" icon={Calendar} />
        <MetricCard title="Streak" value={`${overview.currentStreak} wk${overview.currentStreak !== 1 ? "s" : ""}`} subtitle="consecutive weeks" icon={Flame} />
        <MetricCard title="Avg / Week" value={overview.avgSessionsPerWeek.toString()} subtitle="last 8 weeks" icon={TrendingUp} />
      </div>

      {chartData.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-4">Weekly Volume (last 8 weeks)</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={45}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip formatter={(v: number) => [v.toLocaleString(), "Volume (lbs)"]} {...CHART_STYLE} />
                <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// Training Tab — PRs Feed (JEF-27)
// ============================================================

function PrsFeed({ prs }: { prs: PrEntry[] }) {
  const [showAll, setShowAll] = useState(false);
  const today = new Date();
  const visible = showAll ? prs : prs.slice(0, 5);

  if (prs.length === 0) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        <h3 className="font-medium">Personal Records</h3>
      </div>
      <div className="space-y-2">
        {visible.map((pr, i) => {
          const prDate = parseISO(pr.date);
          const daysAgo = differenceInDays(today, prDate);
          const isNew = daysAgo <= 7;
          return (
            <div key={i} className="flex items-center justify-between gap-2 text-sm py-1 border-b border-border last:border-b-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                  {format(prDate, "MMM d")}
                </span>
                <span className="font-medium truncate">{pr.exerciseName}</span>
                {isNew && (
                  <Badge className="text-[10px] h-4 px-1 bg-green-500 text-white border-0 shrink-0">NEW</Badge>
                )}
              </div>
              <span className="text-muted-foreground shrink-0 text-xs">
                {pr.metric === "weight" ? `${pr.value} lbs` : formatTime(pr.value)}
              </span>
            </div>
          );
        })}
      </div>
      {prs.length > 5 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="text-xs text-primary hover:underline"
        >
          {showAll ? "Show less" : `View all ${prs.length} PRs`}
        </button>
      )}
    </Card>
  );
}

// ============================================================
// Training Tab — Volume Trend (JEF-26)
// ============================================================

function VolumeChart({ data }: { data: VolumeData[] }) {
  if (data.length === 0) return null;
  const chartData = data.map(d => ({
    date: format(parseISO(d.date), "MMM d"),
    volume: d.volume,
  }));
  return (
    <Card className="p-4">
      <h3 className="font-medium mb-4">Training Volume Per Session</h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={45}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
            <Tooltip formatter={(v: number) => [v.toLocaleString(), "Volume (lbs)"]} {...CHART_STYLE} />
            <Line type="monotone" dataKey="volume" stroke="hsl(var(--primary))" strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: "hsl(var(--primary))" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ============================================================
// Training Tab — Volume by Category (JEF-28)
// ============================================================

function CategoryVolumeChart({ data }: { data: CategoryVolume[] }) {
  if (data.length === 0) return null;
  const total = data.reduce((sum, d) => sum + d.volume, 0);
  const chartData = data.map(d => ({
    category: d.category,
    volume: d.volume,
    pct: Math.round((d.volume / total) * 100),
  }));
  return (
    <Card className="p-4">
      <h3 className="font-medium mb-4">Volume by Category</h3>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 40, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
            <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={55} />
            <Tooltip
              formatter={(v: number, _: string, entry: any) => [
                `${v.toLocaleString()} lbs (${entry.payload.pct}%)`,
                "Volume",
              ]}
              {...CHART_STYLE}
            />
            <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ============================================================
// Training Tab — Session Duration (JEF-30)
// ============================================================

function SessionDurationChart({ data }: { data: SessionDuration[] }) {
  if (data.length === 0) return null;
  const avg = Math.round(data.reduce((sum, d) => sum + d.durationMin, 0) / data.length);
  const chartData = data.map(d => ({
    date: format(parseISO(d.date), "MMM d"),
    minutes: d.durationMin,
  }));
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Session Duration</h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Avg {avg} min</span>
        </div>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40}
              tickFormatter={v => `${v}m`} />
            <Tooltip formatter={(v: number) => [`${v} min`, "Duration"]} {...CHART_STYLE} />
            <Line type="monotone" dataKey="minutes" stroke="hsl(var(--primary))" strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ============================================================
// Training Tab — Exercise Analytics (single + compare JEF-31)
// ============================================================

function ProgressChart({ data, metric }: {
  data: AnalyticsData[];
  metric: "weight" | "effort" | "time";
}) {
  const chartData = data.map(d => ({
    date: format(parseISO(d.date), "MMM d"),
    value: metric === "weight" ? (d.maxWeight || 0) :
           metric === "effort" ? (d.totalEffort || 0) :
           (d.bestTime || 0),
  })).filter(d => d.value > 0);

  if (chartData.length === 0) return null;

  const title = metric === "weight" ? "Max Weight" :
                metric === "effort" ? "Total Effort" : "Best Time";

  const formatTooltip = (value: number) => {
    if (metric === "time") return formatTime(value);
    if (metric === "effort") return value.toLocaleString();
    return `${value} lbs`;
  };

  return (
    <Card className="p-4">
      <h3 className="font-medium mb-4">{title} Over Time</h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={50}
              tickFormatter={val => metric === "time" ? `${val}s` : val.toLocaleString()} />
            <Tooltip formatter={(value: number) => [formatTooltip(value), title]} {...CHART_STYLE} />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: "hsl(var(--primary))" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function ComparisonChart({
  dataA,
  dataB,
  nameA,
  nameB,
}: {
  dataA: AnalyticsData[];
  dataB: AnalyticsData[];
  nameA: string;
  nameB: string;
}) {
  // Merge both series on a shared date axis
  const allDates = Array.from(
    new Set([...dataA.map(d => d.date), ...dataB.map(d => d.date)])
  ).sort();

  const mapA = new Map(dataA.map(d => [d.date, d.maxWeight]));
  const mapB = new Map(dataB.map(d => [d.date, d.maxWeight]));

  const chartData = allDates.map(date => ({
    date: format(parseISO(date), "MMM d"),
    a: mapA.get(date) ?? null,
    b: mapB.get(date) ?? null,
  }));

  if (chartData.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="font-medium mb-4">Max Weight — Comparison</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 50, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={45}
              tickFormatter={v => `${v}`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={45}
              tickFormatter={v => `${v}`} />
            <Tooltip
              formatter={(value: number, key: string) => [
                `${value} lbs`,
                key === "a" ? nameA : nameB,
              ]}
              {...CHART_STYLE}
            />
            <Legend formatter={key => key === "a" ? nameA : nameB} wrapperStyle={{ fontSize: 12 }} />
            <Line yAxisId="left" type="monotone" dataKey="a" name="a"
              stroke="hsl(var(--primary))" strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5 }} connectNulls />
            <Line yAxisId="right" type="monotone" dataKey="b" name="b"
              stroke="#60a5fa" strokeWidth={2}
              dot={{ fill: "#60a5fa", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ============================================================
// Training Tab — full tab component
// ============================================================

function TrainingTab() {
  const [timeRange, setTimeRange] = useState<TimeRange>("3mo");
  const [compareMode, setCompareMode] = useState(false);

  // Primary exercise
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>("");

  // Compare exercise (JEF-31)
  const [compareExercise, setCompareExercise] = useState<string>("");
  const [compareExerciseName, setCompareExerciseName] = useState<string>("");

  const { data: overview, isLoading: overviewLoading } = useQuery<OverviewData>({
    queryKey: ["/api/analytics/overview"],
  });

  const { data: prs } = useQuery<PrEntry[]>({
    queryKey: ["/api/analytics/prs"],
  });

  const { data: volumeData, isLoading: volumeLoading } = useQuery<VolumeData[]>({
    queryKey: ["/api/analytics/volume", timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/volume?range=${timeRange}`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: categoryData, isLoading: categoryLoading } = useQuery<CategoryVolume[]>({
    queryKey: ["/api/analytics/volume-by-category", timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/volume-by-category?range=${timeRange}`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: sessionData, isLoading: sessionLoading } = useQuery<SessionDuration[]>({
    queryKey: ["/api/analytics/sessions", timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/sessions?range=${timeRange}`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: exercises, isLoading: exercisesLoading } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises/performed"],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData[]>({
    queryKey: [`/api/analytics/exercise/${selectedExercise}`, timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/exercise/${selectedExercise}?range=${timeRange}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!selectedExercise,
  });

  const { data: compareAnalytics } = useQuery<AnalyticsData[]>({
    queryKey: [`/api/analytics/exercise/${compareExercise}`, timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/exercise/${compareExercise}?range=${timeRange}`, { credentials: "include" });
      return res.json();
    },
    enabled: compareMode && !!compareExercise,
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
    <div className="space-y-6">
      {/* Overview */}
      {overviewLoading ? <ListSkeleton count={4} /> : overview ? <OverviewDashboard overview={overview} /> : null}

      {/* PRs feed (JEF-27) */}
      {prs && prs.length > 0 && <PrsFeed prs={prs} />}

      {/* Range-filtered charts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Trends</h2>
          <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
        </div>

        {/* Volume per session (JEF-26) */}
        {volumeLoading ? <ListSkeleton count={1} /> :
          volumeData && volumeData.length > 0 ? <VolumeChart data={volumeData} /> :
          <Card className="p-4 text-center text-sm text-muted-foreground">No volume data for this range</Card>}

        {/* Volume by category (JEF-28) */}
        {!categoryLoading && categoryData && categoryData.length > 0 && (
          <CategoryVolumeChart data={categoryData} />
        )}

        {/* Session duration (JEF-30) */}
        {!sessionLoading && sessionData && sessionData.length > 0 && (
          <SessionDurationChart data={sessionData} />
        )}
      </div>

      {/* Exercise analytics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Exercise Analytics</h2>
          {/* Compare mode toggle (JEF-31) */}
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => { setCompareMode(false); setCompareExercise(""); setCompareExerciseName(""); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                !compareMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Single
            </button>
            <button
              onClick={() => setCompareMode(true)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                compareMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Compare
            </button>
          </div>
        </div>

        {/* Primary exercise picker */}
        {selectedExercise && !compareMode ? (
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-sm">{selectedExerciseName}</span>
            <button
              onClick={() => { setSelectedExercise(""); setSelectedExerciseName(""); }}
              className="rounded-sm opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div>
            {compareMode && (
              <p className="text-xs text-muted-foreground mb-1">Exercise A</p>
            )}
            <ExerciseSearch
              exercises={exercises}
              isLoading={exercisesLoading}
              onSelect={e => { setSelectedExercise(e.id); setSelectedExerciseName(e.name); }}
            />
            {selectedExercise && compareMode && (
              <div className="flex items-center gap-2 mt-2 rounded-md border border-input bg-background px-3 py-2">
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm">{selectedExerciseName}</span>
                <button onClick={() => { setSelectedExercise(""); setSelectedExerciseName(""); }} className="rounded-sm opacity-70 hover:opacity-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Compare exercise picker (JEF-31) */}
        {compareMode && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Exercise B</p>
            {compareExercise ? (
              <div className="flex items-center gap-2 rounded-md border border-blue-400 bg-background px-3 py-2">
                <Dumbbell className="h-4 w-4 text-blue-400" />
                <span className="flex-1 text-sm">{compareExerciseName}</span>
                <button onClick={() => { setCompareExercise(""); setCompareExerciseName(""); }} className="rounded-sm opacity-70 hover:opacity-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <ExerciseSearch
                exercises={exercises}
                isLoading={exercisesLoading}
                onSelect={e => { setCompareExercise(e.id); setCompareExerciseName(e.name); }}
                placeholder="Search second exercise..."
                testId="input-search-compare"
              />
            )}
          </div>
        )}

        {/* Compare chart */}
        {compareMode && selectedExercise && compareExercise && analytics && compareAnalytics && (
          <ComparisonChart
            dataA={analytics}
            dataB={compareAnalytics}
            nameA={selectedExerciseName}
            nameB={compareExerciseName}
          />
        )}

        {/* Single exercise charts */}
        {!compareMode && selectedExercise && (
          analyticsLoading ? (
            <ListSkeleton count={3} />
          ) : !analytics || analytics.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No data in this range" description="Try a wider time range or log some sets" />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {hasWeightData && (
                  <>
                    <MetricCard title="All-Time Max" value={`${allTimeMaxWeight} lbs`} icon={Weight} />
                    <MetricCard title="Latest Max" value={latestMaxWeight ? `${latestMaxWeight} lbs` : "—"} icon={Dumbbell} />
                  </>
                )}
                {hasTimeData && (
                  <MetricCard title="Best Time" value={bestTime ? formatTime(bestTime) : "—"} icon={Timer} />
                )}
                {hasEffortData && (
                  <MetricCard title="Latest Effort" value={latestEffort ? latestEffort.toLocaleString() : "—"} subtitle="reps × weight" icon={TrendingUp} />
                )}
                <MetricCard title="Sessions" value={totalSessions.toString()} subtitle="in range" icon={BarChart3} />
              </div>
              {hasWeightData && <ProgressChart data={analytics} metric="weight" />}
              {hasEffortData && <ProgressChart data={analytics} metric="effort" />}
              {hasTimeData && <ProgressChart data={analytics} metric="time" />}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ============================================================
// Weight Tab
// ============================================================

function WeightTab() {
  const [timeRange, setTimeRange] = useState<TimeRange>("3mo");

  const { data: weightLogs, isLoading } = useQuery<BodyWeightLog[]>({
    queryKey: ["/api/weight"],
  });

  const filtered = (() => {
    if (!weightLogs) return [];
    const sorted = [...weightLogs].sort((a, b) =>
      new Date(a.loggedAt ?? 0).getTime() - new Date(b.loggedAt ?? 0).getTime()
    );
    if (timeRange === "all") return sorted;
    const now = new Date();
    const cutoffs: Record<TimeRange, Date> = {
      "1mo": new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
      "3mo": new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
      "6mo": new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
      "1yr": new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
      "all": new Date(0),
    };
    return sorted.filter(l => new Date(l.loggedAt ?? 0) >= cutoffs[timeRange]);
  })();

  const chartData = filtered.map((log, i) => {
    const start = Math.max(0, i - 6);
    const window = filtered.slice(start, i + 1);
    const ma = window.reduce((sum, l) => sum + Number(l.weightLbs), 0) / window.length;
    return {
      date: format(new Date(log.loggedAt ?? 0), "MMM d"),
      weight: Number(log.weightLbs),
      ma: window.length >= 3 ? Math.round(ma * 10) / 10 : undefined,
    };
  });

  const current = filtered.length ? Number(filtered[filtered.length - 1].weightLbs) : null;
  const first = filtered.length ? Number(filtered[0].weightLbs) : null;
  const change = current !== null && first !== null ? Math.round((current - first) * 10) / 10 : null;
  const min = filtered.length ? Math.min(...filtered.map(l => Number(l.weightLbs))) : null;
  const max = filtered.length ? Math.max(...filtered.map(l => Number(l.weightLbs))) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Body Weight</h2>
        <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
      </div>

      {isLoading ? (
        <ListSkeleton count={3} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Weight} title="No weight data" description="Log your weight to see trends" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MetricCard title="Current" value={current ? `${current} lbs` : "—"} icon={Weight} />
            <MetricCard
              title="Net Change"
              value={change !== null ? `${change > 0 ? "+" : ""}${change} lbs` : "—"}
              subtitle="vs. start of range"
              icon={change !== null && change > 0 ? TrendingUp : TrendingDown}
              trend={change !== null ? (change > 0 ? "up" : "down") : null}
            />
            <MetricCard title="Low" value={min ? `${min} lbs` : "—"} icon={TrendingDown} />
            <MetricCard title="High" value={max ? `${max} lbs` : "—"} icon={TrendingUp} />
          </div>

          <Card className="p-4">
            <h3 className="font-medium mb-4">Weight Trend</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={50}
                    domain={["auto", "auto"]} tickFormatter={v => `${v}`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value} lbs`,
                      name === "weight" ? "Weight" : "7-day avg",
                    ]}
                    {...CHART_STYLE}
                  />
                  <Legend
                    formatter={value => value === "weight" ? "Weight" : "7-day avg"}
                    iconType="line"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="ma" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5}
                    strokeDasharray="4 2" dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Supplements Tab
// ============================================================

function SupplementCard({ supplement, logs }: { supplement: Supplement; logs: SupplementLog[] }) {
  const myLogs = logs.filter(l => l.supplementId === supplement.id);
  if (myLogs.length === 0) return null;

  const now = startOfDay(new Date());
  const createdDate = supplement.createdAt ? startOfDay(new Date(supplement.createdAt)) : now;
  const daysSinceCreated = Math.max(1, Math.round((now.getTime() - createdDate.getTime()) / (24 * 60 * 60 * 1000)));
  const denominator = Math.min(30, daysSinceCreated);

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const day = startOfDay(subDays(new Date(), 29 - i));
    const dayMs = day.getTime();
    const hasLog = myLogs.some(l => {
      if (!l.takenAt) return false;
      const logDay = startOfDay(new Date(l.takenAt));
      return logDay.getTime() === dayMs;
    });
    return { day, hasLog };
  });

  const loggedDays = new Set(
    last30.slice(30 - denominator).filter(d => d.hasLog).map(d => d.day.getTime())
  );
  const adherence = Math.round((loggedDays.size / denominator) * 100);

  let streak = 0;
  for (let i = 29; i >= 0; i--) {
    if (last30[i].hasLog) streak++;
    else break;
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Pill className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{supplement.name}</p>
            {supplement.defaultDose && (
              <p className="text-xs text-muted-foreground">{supplement.defaultDose}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{adherence}%</p>
          <p className="text-xs text-muted-foreground">30-day adherence</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Flame className="h-3 w-3 text-orange-500" />
        <span>{streak === 0 ? "No current streak" : `${streak}-day streak`}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {last30.map(({ day, hasLog }, i) => (
          <div
            key={i}
            title={format(day, "MMM d")}
            className={`w-2.5 h-2.5 rounded-sm ${hasLog ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{format(last30[0].day, "MMM d")}</span>
        <span>Today</span>
      </div>
    </Card>
  );
}

function SupplementsTab() {
  const { data: supplements, isLoading: supplementsLoading } = useQuery<Supplement[]>({
    queryKey: ["/api/supplements"],
  });
  const { data: logs, isLoading: logsLoading } = useQuery<SupplementLog[]>({
    queryKey: ["/api/supplements/logs"],
  });

  const isLoading = supplementsLoading || logsLoading;
  const supplementsWithLogs = supplements?.filter(s => logs?.some(l => l.supplementId === s.id));

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Supplement Adherence</h2>
      {isLoading ? (
        <ListSkeleton count={3} />
      ) : !supplementsWithLogs || supplementsWithLogs.length === 0 ? (
        <EmptyState icon={Pill} title="No supplement data" description="Log your supplements to see adherence analytics" />
      ) : (
        <div className="space-y-3">
          {supplementsWithLogs.map(s => (
            <SupplementCard key={s.id} supplement={s} logs={logs || []} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<Tab>("training");

  const tabs: { value: Tab; label: string; icon: typeof BarChart3 }[] = [
    { value: "training", label: "Training", icon: BarChart3 },
    { value: "weight", label: "Weight", icon: Weight },
    { value: "supplements", label: "Supplements", icon: Pill },
  ];

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
            <p className="text-muted-foreground text-sm mt-1">Track your progress over time</p>
          </div>
        </div>

        <div className="flex border-b border-border">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.value
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "training" && <TrainingTab />}
        {activeTab === "weight" && <WeightTab />}
        {activeTab === "supplements" && <SupplementsTab />}
      </div>
    </AppLayout>
  );
}
