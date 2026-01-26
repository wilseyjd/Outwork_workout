import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton, ListSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ArrowLeft, Dumbbell, TrendingUp, History, Clock } from "lucide-react";
import { format } from "date-fns";
import type { Exercise, PerformedSet, WorkoutSession } from "@shared/schema";

interface SetWithSession extends PerformedSet {
  session?: WorkoutSession;
}

interface ExerciseWithHistory extends Exercise {
  lastPerformed?: {
    date: Date;
    sets: PerformedSet[];
  };
  history?: SetWithSession[];
}

export default function ExerciseDetail() {
  const [, params] = useRoute("/exercise/:id");
  const exerciseId = params?.id;

  const { data: exercise, isLoading } = useQuery<ExerciseWithHistory>({
    queryKey: ["/api/exercises", exerciseId],
    enabled: !!exerciseId,
  });

  const { data: exerciseHistory, isLoading: historyLoading } = useQuery<SetWithSession[]>({
    queryKey: ["/api/exercises", exerciseId, "history"],
    enabled: !!exerciseId,
  });

  if (isLoading) {
    return (
      <AppLayout>
        <PageSkeleton />
      </AppLayout>
    );
  }

  if (!exercise) {
    return (
      <AppLayout>
        <EmptyState
          icon={Dumbbell}
          title="Exercise not found"
          description="This exercise doesn't exist or was deleted"
        />
      </AppLayout>
    );
  }

  const lastSession = exerciseHistory?.[0];
  const groupedHistory = exerciseHistory?.reduce((acc, set) => {
    const sessionId = (set as any).sessionId;
    if (!acc[sessionId]) {
      acc[sessionId] = {
        session: set.session,
        sets: [],
      };
    }
    acc[sessionId].sets.push(set);
    return acc;
  }, {} as Record<string, { session?: WorkoutSession; sets: PerformedSet[] }>);

  const sessionGroups = groupedHistory ? Object.values(groupedHistory).slice(0, 5) : [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/exercises">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate" data-testid="text-exercise-name">
              {exercise.name}
            </h1>
            {exercise.category && (
              <Badge variant="secondary" className="mt-1">{exercise.category}</Badge>
            )}
          </div>
        </div>

        {exercise.notes && (
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">{exercise.notes}</p>
          </Card>
        )}

        <div className="space-y-3">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Last Time
          </h2>
          
          {lastSession ? (
            <Card className="p-4 bg-primary/5 border-primary/20" data-testid="card-last-time">
              <p className="text-sm text-muted-foreground mb-3">
                {format(new Date(lastSession.createdAt!), "EEEE, MMMM d")}
              </p>
              <div className="space-y-2">
                {sessionGroups[0]?.sets.map((set, i) => (
                  <div key={set.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Set {set.setNumber}</span>
                    <div className="flex items-center gap-3">
                      {set.actualWeight && (
                        <span className="font-semibold">{set.actualWeight} lbs</span>
                      )}
                      {set.actualReps && (
                        <span>{set.actualReps} reps</span>
                      )}
                      {set.actualTimeSeconds && (
                        <span>{set.actualTimeSeconds}s</span>
                      )}
                      {set.isWarmup && (
                        <Badge variant="secondary" className="text-xs">warmup</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-6 text-center text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No history yet</p>
              <p className="text-xs">Complete a workout with this exercise to see your last performance</p>
            </Card>
          )}
        </div>

        {sessionGroups.length > 1 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Recent History
            </h2>
            
            {historyLoading ? (
              <ListSkeleton count={3} />
            ) : (
              <div className="space-y-3">
                {sessionGroups.slice(1).map((group, index) => (
                  <Card key={index} className="p-3" data-testid={`card-history-${index}`}>
                    <p className="text-xs text-muted-foreground mb-2">
                      {group.session?.startedAt && format(new Date(group.session.startedAt), "MMM d, yyyy")}
                    </p>
                    <div className="space-y-1">
                      {group.sets.map((set) => (
                        <div key={set.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground text-xs">#{set.setNumber}</span>
                          <div className="flex items-center gap-2 text-xs">
                            {set.actualWeight && <span>{set.actualWeight} lbs</span>}
                            {set.actualReps && <span>× {set.actualReps}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
