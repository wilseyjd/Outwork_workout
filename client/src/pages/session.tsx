import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { AppHeader } from "@/components/app-header";
import { Play, Square, Plus, Check, Dumbbell, Clock, ChevronDown, ChevronUp, Save } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkoutSession, SessionExercise, PerformedSet, Exercise, PlannedSet } from "@shared/schema";

interface SessionExerciseWithDetails extends SessionExercise {
  exercise?: Exercise;
  performedSets?: PerformedSet[];
  plannedSets?: PlannedSet[];
}

interface SessionWithDetails extends WorkoutSession {
  exercises?: SessionExerciseWithDetails[];
  templateName?: string;
}

export default function Session() {
  const [, params] = useRoute("/session/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const sessionId = params?.id;
  const isNew = sessionId === "new";

  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [sessionNotes, setSessionNotes] = useState("");
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [addSetForm, setAddSetForm] = useState<{
    exerciseId: string | null;
    reps: string;
    weight: string;
    time: string;
    rest: string;
    isWarmup: boolean;
  }>({
    exerciseId: null,
    reps: "",
    weight: "",
    time: "",
    rest: "",
    isWarmup: false,
  });

  const { data: session, isLoading } = useQuery<SessionWithDetails>({
    queryKey: ["/api/sessions", sessionId],
    enabled: !isNew && !!sessionId,
    refetchInterval: (query) => {
      const data = query.state.data as SessionWithDetails | undefined;
      return data?.endedAt ? false : 10000;
    },
  });

  const createAdHocMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<WorkoutSession>("POST", "/api/sessions/adhoc");
    },
    onSuccess: (data) => {
      navigate(`/session/${data.id}`, { replace: true });
    },
    onError: () => {
      toast({ title: "Failed to start workout", variant: "destructive" });
    },
  });

  const addSetMutation = useMutation({
    mutationFn: async ({ sessionExerciseId, data }: {
      sessionExerciseId: string;
      data: {
        setNumber: number;
        actualReps?: number;
        actualWeight?: string;
        actualTimeSeconds?: number;
        restSeconds?: number;
        isWarmup?: boolean;
      };
    }) => {
      return await apiRequest("POST", `/api/sessions/${sessionId}/exercises/${sessionExerciseId}/sets`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId] });
      resetAddSetForm();
      toast({ title: "Set logged" });
    },
    onError: () => {
      toast({ title: "Failed to log set", variant: "destructive" });
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/sessions/${sessionId}/end`, {
        notes: sessionNotes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      setEndDialogOpen(false);
      navigate("/history");
      toast({ title: "Workout completed!" });
    },
    onError: () => {
      toast({ title: "Failed to end workout", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (isNew) {
      createAdHocMutation.mutate();
    }
  }, [isNew]);

  useEffect(() => {
    if (session?.notes) {
      setSessionNotes(session.notes);
    }
  }, [session?.notes]);

  const resetAddSetForm = () => {
    setAddSetForm({
      exerciseId: null,
      reps: "",
      weight: "",
      time: "",
      rest: "",
      isWarmup: false,
    });
  };

  const handleAddSet = (sessionExerciseId: string, currentSetsCount: number) => {
    const data: any = {
      setNumber: currentSetsCount + 1,
    };

    if (addSetForm.reps) data.actualReps = parseInt(addSetForm.reps);
    if (addSetForm.weight) data.actualWeight = addSetForm.weight;
    if (addSetForm.time) data.actualTimeSeconds = parseInt(addSetForm.time);
    if (addSetForm.rest) data.restSeconds = parseInt(addSetForm.rest);
    data.isWarmup = addSetForm.isWarmup;

    addSetMutation.mutate({ sessionExerciseId, data });
  };

  const formatElapsedTime = () => {
    if (!session?.startedAt) return "0:00";
    const start = new Date(session.startedAt);
    const now = session.endedAt ? new Date(session.endedAt) : new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    const hrs = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading || isNew) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="max-w-lg mx-auto px-4 py-4">
          <PageSkeleton />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="max-w-lg mx-auto px-4 py-4">
          <EmptyState
            icon={Dumbbell}
            title="Session not found"
            description="This workout session doesn't exist"
            action={{
              label: "Go to Today",
              onClick: () => navigate("/"),
            }}
          />
        </div>
      </div>
    );
  }

  const isActive = !session.endedAt;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-muted"}`} />
              <div>
                <p className="font-semibold text-sm">{session.templateName || "Ad-hoc Workout"}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatElapsedTime()}</span>
                </div>
              </div>
            </div>
            {isActive ? (
              <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="destructive" data-testid="button-end-workout">
                    <Square className="h-4 w-4 mr-1" />
                    End
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>End Workout?</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="session-notes">Notes (optional)</Label>
                      <Textarea
                        id="session-notes"
                        placeholder="How did the workout feel?"
                        value={sessionNotes}
                        onChange={(e) => setSessionNotes(e.target.value)}
                        data-testid="input-session-notes"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1" 
                        onClick={() => endSessionMutation.mutate()}
                        disabled={endSessionMutation.isPending}
                        data-testid="button-confirm-end"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Complete Workout
                      </Button>
                      <Button variant="outline" onClick={() => setEndDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <Badge variant="secondary">Completed</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {session.exercises && session.exercises.length > 0 ? (
          session.exercises.map((sessionExercise, index) => {
            const isExpanded = expandedExercise === sessionExercise.id;
            const completedSets = sessionExercise.performedSets?.length || 0;
            const plannedSets = sessionExercise.plannedSets?.length || 0;

            return (
              <Card key={sessionExercise.id} className="overflow-hidden" data-testid={`card-exercise-${sessionExercise.id}`}>
                <button
                  onClick={() => setExpandedExercise(isExpanded ? null : sessionExercise.id)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{sessionExercise.exercise?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {completedSets}{plannedSets > 0 ? `/${plannedSets}` : ""} sets
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {sessionExercise.plannedSets && sessionExercise.plannedSets.length > 0 && (
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Target</p>
                        <div className="flex flex-wrap gap-2">
                          {sessionExercise.plannedSets.map((set) => (
                            <Badge key={set.id} variant="outline" className="text-xs">
                              {set.targetReps && `${set.targetReps}×`}
                              {set.targetWeight && `${set.targetWeight}lbs`}
                              {set.targetTimeSeconds && `${set.targetTimeSeconds}s`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {sessionExercise.performedSets && sessionExercise.performedSets.length > 0 && (
                      <div className="space-y-1">
                        {sessionExercise.performedSets.map((set) => (
                          <div
                            key={set.id}
                            className="flex items-center justify-between px-3 py-2 bg-green-50 dark:bg-green-950/20 rounded-lg text-sm"
                            data-testid={`row-set-${set.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" />
                              <span className="font-medium">Set {set.setNumber}</span>
                              {set.isWarmup && (
                                <Badge variant="secondary" className="text-xs">warmup</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-muted-foreground">
                              {set.actualWeight && <span>{set.actualWeight} lbs</span>}
                              {set.actualReps && <span>{set.actualReps} reps</span>}
                              {set.actualTimeSeconds && <span>{set.actualTimeSeconds}s</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {isActive && (
                      <>
                        {addSetForm.exerciseId === sessionExercise.id ? (
                          <div className="space-y-3 p-3 border border-border rounded-lg">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Reps</Label>
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  placeholder="10"
                                  value={addSetForm.reps}
                                  onChange={(e) => setAddSetForm(prev => ({ ...prev, reps: e.target.value }))}
                                  className="h-12 text-lg"
                                  data-testid="input-actual-reps"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Weight (lbs)</Label>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  placeholder="135"
                                  value={addSetForm.weight}
                                  onChange={(e) => setAddSetForm(prev => ({ ...prev, weight: e.target.value }))}
                                  className="h-12 text-lg"
                                  data-testid="input-actual-weight"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Time (sec)</Label>
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  placeholder="60"
                                  value={addSetForm.time}
                                  onChange={(e) => setAddSetForm(prev => ({ ...prev, time: e.target.value }))}
                                  data-testid="input-actual-time"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Rest (sec)</Label>
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  placeholder="90"
                                  value={addSetForm.rest}
                                  onChange={(e) => setAddSetForm(prev => ({ ...prev, rest: e.target.value }))}
                                  data-testid="input-actual-rest"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`warmup-set-${sessionExercise.id}`}
                                checked={addSetForm.isWarmup}
                                onCheckedChange={(checked) => setAddSetForm(prev => ({ ...prev, isWarmup: !!checked }))}
                                data-testid="checkbox-actual-warmup"
                              />
                              <Label htmlFor={`warmup-set-${sessionExercise.id}`} className="text-sm">Warmup</Label>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                className="flex-1 h-12"
                                onClick={() => handleAddSet(sessionExercise.id, completedSets)}
                                disabled={addSetMutation.isPending}
                                data-testid="button-log-set"
                              >
                                <Save className="h-4 w-4 mr-2" />
                                Log Set
                              </Button>
                              <Button variant="outline" onClick={resetAddSetForm}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full h-12"
                            onClick={() => setAddSetForm(prev => ({ ...prev, exerciseId: sessionExercise.id }))}
                            data-testid={`button-add-set-${sessionExercise.id}`}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Log Set
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon={Dumbbell}
            title="No exercises"
            description="This workout has no exercises"
          />
        )}
      </div>
    </div>
  );
}
