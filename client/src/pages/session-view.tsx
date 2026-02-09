import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ArrowLeft, Dumbbell, Clock, Calendar, CheckCircle2, Repeat } from "lucide-react";
import { format } from "date-fns";
import type { WorkoutSession, SessionExercise, PerformedSet, Exercise } from "@shared/schema";

interface SessionExerciseWithDetails extends SessionExercise {
  exercise?: Exercise;
  performedSets?: PerformedSet[];
}

interface SessionWithDetails extends WorkoutSession {
  exercises?: SessionExerciseWithDetails[];
  templateName?: string;
  circuitNames?: Record<string, string>;
}

export default function SessionView() {
  const [, params] = useRoute("/session/:id/view");
  const sessionId = params?.id;

  const { data: session, isLoading } = useQuery<SessionWithDetails>({
    queryKey: ["/api/sessions", sessionId],
    enabled: !!sessionId,
  });

  const formatDuration = () => {
    if (!session?.startedAt || !session?.endedAt) return "In progress";
    const start = new Date(session.startedAt);
    const end = new Date(session.endedAt);
    const mins = Math.round((end.getTime() - start.getTime()) / 60000);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  const totalSets = session?.exercises?.reduce(
    (sum, ex) => sum + (ex.performedSets?.length || 0), 0
  ) || 0;

  const totalVolume = session?.exercises?.reduce((sum, ex) => {
    return sum + (ex.performedSets?.reduce((setSum, set) => {
      if (set.actualWeight && set.actualReps) {
        return setSum + (Number(set.actualWeight) * set.actualReps);
      }
      return setSum;
    }, 0) || 0);
  }, 0) || 0;

  if (isLoading) {
    return (
      <AppLayout>
        <PageSkeleton />
      </AppLayout>
    );
  }

  if (!session) {
    return (
      <AppLayout>
        <EmptyState
          icon={Dumbbell}
          title="Session not found"
          description="This workout session doesn't exist"
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/history">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate" data-testid="text-session-name">
              {session.templateName || "Ad-hoc Workout"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(session.startedAt), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="font-semibold">{formatDuration()}</p>
            <p className="text-xs text-muted-foreground">Duration</p>
          </Card>
          <Card className="p-3 text-center">
            <Dumbbell className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="font-semibold">{session.exercises?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Exercises</p>
          </Card>
          <Card className="p-3 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="font-semibold">{totalSets}</p>
            <p className="text-xs text-muted-foreground">Sets</p>
          </Card>
        </div>

        {totalVolume > 0 && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <p className="text-sm text-muted-foreground">Total Volume</p>
            <p className="text-2xl font-bold">{totalVolume.toLocaleString()} lbs</p>
          </Card>
        )}

        {session.notes && (
          <Card className="p-4">
            <p className="text-sm font-medium mb-1">Notes</p>
            <p className="text-muted-foreground">{session.notes}</p>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Exercises</h2>
          {session.exercises && session.exercises.length > 0 ? (
            (() => {
              const renderExerciseCard = (sessionExercise: SessionExerciseWithDetails, displayIndex: number) => (
                <Card key={sessionExercise.id} className="p-4" data-testid={`card-exercise-${sessionExercise.id}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {displayIndex}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{sessionExercise.exercise?.name}</p>
                        {sessionExercise.circuitRound && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            Rd {sessionExercise.circuitRound}
                          </Badge>
                        )}
                      </div>
                      {sessionExercise.exercise?.category && (
                        <Badge variant="secondary" className="text-xs">
                          {sessionExercise.exercise.category}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {sessionExercise.performedSets && sessionExercise.performedSets.length > 0 && (
                    <div className="space-y-1">
                      {sessionExercise.performedSets.map((set) => (
                        <div
                          key={set.id}
                          className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-12">Set {set.setNumber}</span>
                            {set.isWarmup && (
                              <Badge variant="secondary" className="text-xs">warmup</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {set.actualWeight && (
                              <span className="font-medium">{set.actualWeight} lbs</span>
                            )}
                            {set.actualReps && <span>{set.actualReps} reps</span>}
                            {set.actualTimeSeconds && <span>{set.actualTimeSeconds}s</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );

              const elements: JSX.Element[] = [];
              let displayIndex = 1;
              let i = 0;
              const exercises = session.exercises!;

              while (i < exercises.length) {
                const ex = exercises[i];
                if (ex.circuitId) {
                  // Collect all consecutive exercises with the same circuitId
                  const circuitExercises: SessionExerciseWithDetails[] = [];
                  const currentCircuitId = ex.circuitId;
                  while (i < exercises.length && exercises[i].circuitId === currentCircuitId) {
                    circuitExercises.push(exercises[i]);
                    i++;
                  }
                  const circuitName = session.circuitNames?.[currentCircuitId] || "Circuit";
                  const totalRounds = circuitExercises[0]?.circuitRounds || 1;

                  elements.push(
                    <div key={`circuit-${currentCircuitId}-${displayIndex}`} className="border-l-4 border-primary pl-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Repeat className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">{circuitName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {totalRounds} {totalRounds === 1 ? "round" : "rounds"}
                        </Badge>
                      </div>
                      {circuitExercises.map((ce) => {
                        const card = renderExerciseCard(ce, displayIndex);
                        displayIndex++;
                        return card;
                      })}
                    </div>
                  );
                } else {
                  elements.push(renderExerciseCard(ex, displayIndex));
                  displayIndex++;
                  i++;
                }
              }
              return elements;
            })()
          ) : (
            <Card className="p-6 text-center text-muted-foreground">
              <p>No exercises recorded</p>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
