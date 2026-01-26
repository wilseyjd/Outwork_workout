import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { History as HistoryIcon, Dumbbell, Clock, ChevronRight, BarChart3, Download } from "lucide-react";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import type { WorkoutSession, WorkoutTemplate } from "@shared/schema";

interface SessionWithTemplate extends WorkoutSession {
  template?: WorkoutTemplate;
  exerciseCount?: number;
  setCount?: number;
}

export default function History() {
  const { data: sessions, isLoading } = useQuery<SessionWithTemplate[]>({
    queryKey: ["/api/sessions"],
  });

  const downloadCSV = async () => {
    if (!sessions || sessions.length === 0) return;
    
    try {
      const response = await fetch("/api/sessions/export", { credentials: "include" });
      if (!response.ok) throw new Error("Export failed");
      const exportData = await response.json();
      
      const headers = [
        "Date", "Time", "Workout", "Duration (min)", 
        "Exercise", "Set #", "Warmup",
        "Planned Reps", "Planned Weight", "Planned Time (s)", "Rest (s)",
        "Actual Reps", "Actual Weight", "Actual Time (s)", "Notes"
      ];
      
      const rows: string[][] = [];
      
      for (const session of exportData) {
        const start = new Date(session.startedAt);
        let duration = "";
        if (session.endedAt) {
          const end = new Date(session.endedAt);
          duration = Math.round((end.getTime() - start.getTime()) / 60000).toString();
        }
        
        const workoutName = session.templateName || "Ad-hoc Workout";
        const dateStr = format(start, "yyyy-MM-dd");
        const timeStr = format(start, "HH:mm");
        
        if (!session.exercises || session.exercises.length === 0) {
          rows.push([dateStr, timeStr, workoutName, duration, "", "", "", "", "", "", "", "", "", "", ""]);
        } else {
          for (const exercise of session.exercises) {
            const maxSets = Math.max(
              exercise.performedSets?.length || 0,
              exercise.plannedSets?.length || 0,
              1
            );
            
            for (let i = 0; i < maxSets; i++) {
              const planned = exercise.plannedSets?.[i];
              const performed = exercise.performedSets?.[i];
              
              rows.push([
                dateStr,
                timeStr,
                workoutName,
                duration,
                exercise.exerciseName,
                (i + 1).toString(),
                performed?.isWarmup ? "Yes" : (planned?.isWarmup ? "Yes" : "No"),
                planned?.targetReps?.toString() || "",
                planned?.targetWeight || "",
                planned?.targetTimeSeconds?.toString() || "",
                planned?.restSeconds?.toString() || "",
                performed?.actualReps?.toString() || "",
                performed?.actualWeight || "",
                performed?.actualTimeSeconds?.toString() || "",
                performed?.notes || ""
              ]);
            }
          }
        }
      }
      
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `workout-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const formatDuration = (session: SessionWithTemplate) => {
    if (!session.endedAt) return "In progress";
    const start = new Date(session.startedAt);
    const end = new Date(session.endedAt);
    const mins = Math.round((end.getTime() - start.getTime()) / 60000);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">History</h1>
            <p className="text-muted-foreground text-sm mt-1">Past workout sessions</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadCSV}
              disabled={!sessions || sessions.length === 0}
              data-testid="button-download"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Link href="/analytics">
              <Button variant="outline" size="sm" data-testid="button-analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <ListSkeleton count={5} />
        ) : sessions && sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link key={session.id} href={`/session/${session.id}/view`}>
                <Card 
                  className="p-4 hover-elevate cursor-pointer"
                  data-testid={`card-session-${session.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {session.template?.name || "Ad-hoc Workout"}
                        </p>
                        {!session.endedAt && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                        <span>{format(new Date(session.startedAt), "MMM d, h:mm a")}</span>
                        {session.endedAt && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(session)}
                            </span>
                          </>
                        )}
                      </div>
                      {(session.exerciseCount || session.setCount) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {session.exerciseCount} exercises · {session.setCount} sets
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={HistoryIcon}
            title="No workouts yet"
            description="Complete a workout to see it in your history"
          />
        )}
      </div>
    </AppLayout>
  );
}
