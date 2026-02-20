import { useState, useEffect, useCallback, useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { AppHeader } from "@/components/app-header";
import { RestTimer } from "@/components/rest-timer";
import { Play, Square, Plus, Check, Dumbbell, Clock, ChevronDown, ChevronUp, Save, Repeat, Search, Pencil, ArrowUp, ArrowDown, Trash2, ArrowLeft } from "lucide-react";
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
  circuitNames?: Record<string, string>;
}

type AddSetForm = {
  exerciseId: string | null;
  reps: string;
  weight: string;
  time: string;
  distance: string;
  rest: string;
  isWarmup: boolean;
};

const defaultForm: AddSetForm = {
  exerciseId: null,
  reps: "",
  weight: "",
  time: "",
  distance: "",
  rest: "",
  isWarmup: false,
};

type Tracking = { weight: boolean; reps: boolean; time: boolean; distance: boolean };
const defaultTracking: Tracking = { weight: true, reps: true, time: false, distance: false };

function getTracking(exercise?: Exercise): Tracking {
  if (!exercise?.defaultTracking) return defaultTracking;
  const t = exercise.defaultTracking as Partial<Tracking>;
  return { ...defaultTracking, ...t };
}

function getUnits(exercise?: Exercise): { weight: string; distance: string; time: string } {
  return {
    weight:   exercise?.weightUnit   ?? "lbs",
    distance: exercise?.distanceUnit ?? "mi",
    time:     exercise?.timeUnit     ?? "sec",
  };
}

function toStoredSeconds(timeStr: string, unit: string): number {
  const val = parseFloat(timeStr) || 0;
  return unit === "min" ? Math.round(val * 60) : Math.round(val);
}

function fromStoredSeconds(seconds: number, unit: string): string {
  if (unit === "min") {
    const mins = seconds / 60;
    return Number.isInteger(mins) ? mins.toString() : mins.toFixed(1);
  }
  return seconds.toString();
}

function getPreFillValues(
  sessionExercise: SessionExerciseWithDetails,
  lastPerformance?: Record<string, PerformedSet[]>,
): Omit<AddSetForm, "exerciseId"> | null {
  const nextSetNumber = (sessionExercise.performedSets?.length || 0) + 1;

  // Priority 1: Planned set from template
  if (sessionExercise.plannedSets && sessionExercise.plannedSets.length > 0) {
    const planned = sessionExercise.plannedSets.find(s => s.setNumber === nextSetNumber)
      || sessionExercise.plannedSets[0];
    if (planned) {
      return {
        reps: planned.targetReps?.toString() || "",
        weight: planned.targetWeight?.toString() || "",
        time: planned.targetTimeSeconds?.toString() || "",
        distance: (planned as any).targetDistance?.toString() || "",
        rest: planned.restSeconds?.toString() || "",
        isWarmup: planned.isWarmup || false,
      };
    }
  }

  // Priority 2: Last session's performance
  const exerciseId = sessionExercise.exerciseId;
  const lastSets = lastPerformance?.[exerciseId];
  if (lastSets && lastSets.length > 0) {
    const lastSet = lastSets.find(s => s.setNumber === nextSetNumber) || lastSets[0];
    return {
      reps: lastSet.actualReps?.toString() || "",
      weight: lastSet.actualWeight?.toString() || "",
      time: lastSet.actualTimeSeconds?.toString() || "",
      distance: (lastSet as any).actualDistance?.toString() || "",
      rest: lastSet.restSeconds?.toString() || "",
      isWarmup: false,
    };
  }

  // Priority 3: Previous set in current session
  if (sessionExercise.performedSets && sessionExercise.performedSets.length > 0) {
    const prevSet = sessionExercise.performedSets[sessionExercise.performedSets.length - 1];
    return {
      reps: prevSet.actualReps?.toString() || "",
      weight: prevSet.actualWeight?.toString() || "",
      time: prevSet.actualTimeSeconds?.toString() || "",
      distance: (prevSet as any).actualDistance?.toString() || "",
      rest: prevSet.restSeconds?.toString() || "",
      isWarmup: false,
    };
  }

  return null;
}

function formatPreFillSummary(
  preFill: Omit<AddSetForm, "exerciseId">,
  tracking: Tracking,
  units: { weight: string; distance: string; time: string }
): string {
  const parts: string[] = [];
  if (tracking.weight && preFill.weight) parts.push(`${preFill.weight} ${units.weight}`);
  if (tracking.reps && preFill.reps) parts.push(`${preFill.reps} reps`);
  if (tracking.time && preFill.time) {
    const displayVal = fromStoredSeconds(parseInt(preFill.time), units.time);
    parts.push(`${displayVal} ${units.time}`);
  }
  if (tracking.distance && preFill.distance) parts.push(`${preFill.distance} ${units.distance}`);
  return parts.length > 0 ? parts.join(" / ") : "";
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
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [createExerciseOpen, setCreateExerciseOpen] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseCategory, setNewExerciseCategory] = useState("");
  const [addSetForm, setAddSetForm] = useState<AddSetForm>({ ...defaultForm });
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const addSetGuard = useRef(false);
  const [editingSet, setEditingSet] = useState<{
    setId: string;
    sessionExerciseId: string;
    reps: string;
    weight: string;
    time: string;
    distance: string;
    rest: string;
    isWarmup: boolean;
  } | null>(null);

  const { data: session, isLoading } = useQuery<SessionWithDetails>({
    queryKey: ["/api/sessions", sessionId],
    enabled: !isNew && !!sessionId,
    refetchInterval: (query) => {
      const data = query.state.data as SessionWithDetails | undefined;
      return data?.endedAt ? false : 10000;
    },
  });

  const isActive = session ? !session.endedAt : false;

  const { data: lastPerformance } = useQuery<Record<string, PerformedSet[]>>({
    queryKey: ["/api/sessions", sessionId, "last-performance"],
    enabled: !!sessionId && !isNew && isActive,
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

  const { data: allExercises } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises"],
    enabled: addExerciseOpen,
  });

  const filteredExercises = allExercises?.filter(e =>
    e.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
    e.category?.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
  );

  const addExerciseMutation = useMutation({
    mutationFn: async (exerciseId: string) => {
      const position = (session?.exercises?.length || 0) + 1;
      return await apiRequest("POST", `/api/sessions/${sessionId}/exercises`, {
        exerciseId,
        position,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId] });
      setAddExerciseOpen(false);
      setExerciseSearchQuery("");
      toast({ title: "Exercise added" });
    },
    onError: () => {
      toast({ title: "Failed to add exercise", variant: "destructive" });
    },
  });

  const exerciseCategories = ["Chest", "Arms", "Back", "Legs", "Core", "Cardio", "Other"];

  const createExerciseMutation = useMutation({
    mutationFn: async ({ name, category }: { name: string; category: string }) => {
      const defaultTracking = category === "Cardio"
        ? { weight: false, reps: false, time: true, distance: true }
        : { weight: true, reps: true, time: false, distance: false };
      return await apiRequest<Exercise>("POST", "/api/exercises", { name, category, defaultTracking });
    },
    onSuccess: (newExercise) => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      addExerciseMutation.mutate(newExercise.id);
      setCreateExerciseOpen(false);
      setNewExerciseName("");
      setNewExerciseCategory("");
      setExerciseSearchQuery("");
    },
    onError: () => {
      toast({ title: "Failed to create exercise", variant: "destructive" });
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
        actualDistance?: string;
        restSeconds?: number;
        isWarmup?: boolean;
      };
    }) => {
      return await apiRequest("POST", `/api/sessions/${sessionId}/exercises/${sessionExerciseId}/sets`, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId] });
      // Start rest timer if rest seconds specified
      const restSecs = variables.data.restSeconds;
      if (restSecs && restSecs > 0) {
        setRestTimer(restSecs);
      }
      resetAddSetForm();
      toast({ title: "Set logged" });
    },
    onError: () => {
      toast({ title: "Failed to log set", variant: "destructive" });
    },
    onSettled: () => {
      addSetGuard.current = false;
    },
  });

  const updateSetMutation = useMutation({
    mutationFn: async ({ sessionExerciseId, setId, data }: {
      sessionExerciseId: string;
      setId: string;
      data: {
        actualReps?: number;
        actualWeight?: string;
        actualTimeSeconds?: number;
        actualDistance?: string;
        restSeconds?: number;
        isWarmup?: boolean;
      };
    }) => {
      return await apiRequest("PATCH", `/api/sessions/${sessionId}/exercises/${sessionExerciseId}/sets/${setId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId] });
      setEditingSet(null);
      toast({ title: "Set updated" });
    },
    onError: () => {
      toast({ title: "Failed to update set", variant: "destructive" });
    },
  });

  const deleteSetMutation = useMutation({
    mutationFn: async ({ sessionExerciseId, setId }: { sessionExerciseId: string; setId: string }) => {
      return await apiRequest("DELETE", `/api/sessions/${sessionId}/exercises/${sessionExerciseId}/sets/${setId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId] });
      setEditingSet(null);
      toast({ title: "Set deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete set", variant: "destructive" });
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
    setAddSetForm({ ...defaultForm });
  };

  const handleAddSet = (sessionExercise: SessionExerciseWithDetails, currentSetsCount: number) => {
    if (addSetGuard.current) return;
    addSetGuard.current = true;

    const units = getUnits(sessionExercise.exercise);
    const data: any = {
      setNumber: currentSetsCount + 1,
    };

    if (addSetForm.reps) data.actualReps = parseInt(addSetForm.reps);
    if (addSetForm.weight) data.actualWeight = addSetForm.weight;
    if (addSetForm.time) data.actualTimeSeconds = toStoredSeconds(addSetForm.time, units.time);
    if (addSetForm.distance) data.actualDistance = addSetForm.distance;
    if (addSetForm.rest) data.restSeconds = parseInt(addSetForm.rest);
    data.isWarmup = addSetForm.isWarmup;

    addSetMutation.mutate({ sessionExerciseId: sessionExercise.id, data });
  };

  const handleQuickLog = (sessionExercise: SessionExerciseWithDetails, preFill: Omit<AddSetForm, "exerciseId">) => {
    if (addSetGuard.current) return;
    addSetGuard.current = true;

    const currentSetsCount = sessionExercise.performedSets?.length || 0;
    const data: any = {
      setNumber: currentSetsCount + 1,
    };

    if (preFill.reps) data.actualReps = parseInt(preFill.reps);
    if (preFill.weight) data.actualWeight = preFill.weight;
    if (preFill.time) data.actualTimeSeconds = parseInt(preFill.time);
    if (preFill.distance) data.actualDistance = preFill.distance;
    if (preFill.rest) data.restSeconds = parseInt(preFill.rest);
    data.isWarmup = preFill.isWarmup;

    addSetMutation.mutate({ sessionExerciseId: sessionExercise.id, data });
  };

  const openFormWithPreFill = (sessionExercise: SessionExerciseWithDetails) => {
    const units = getUnits(sessionExercise.exercise);
    const preFill = getPreFillValues(sessionExercise, lastPerformance);
    if (preFill) {
      setAddSetForm({
        exerciseId: sessionExercise.id,
        ...preFill,
        time: preFill.time ? fromStoredSeconds(parseInt(preFill.time), units.time) : "",
      });
    } else {
      setAddSetForm({ ...defaultForm, exerciseId: sessionExercise.id });
    }
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
          (() => {
            // Group exercises by circuit
            const groups: Array<{
              type: "exercise" | "circuit";
              circuitId?: string;
              circuitName?: string;
              circuitRounds?: number;
              items: SessionExerciseWithDetails[];
            }> = [];

            let currentCircuitId: string | null = null;
            let currentGroup: typeof groups[0] | null = null;

            for (const ex of session.exercises!) {
              if (ex.circuitId) {
                if (ex.circuitId !== currentCircuitId) {
                  currentCircuitId = ex.circuitId;
                  currentGroup = {
                    type: "circuit",
                    circuitId: ex.circuitId,
                    circuitName: session.circuitNames?.[ex.circuitId] || "Circuit",
                    circuitRounds: ex.circuitRounds || 1,
                    items: [],
                  };
                  groups.push(currentGroup);
                }
                currentGroup!.items.push(ex);
              } else {
                currentCircuitId = null;
                currentGroup = null;
                groups.push({ type: "exercise", items: [ex] });
              }
            }

            return groups.map((group) => {
              if (group.type === "circuit") {
                return (
                  <div key={`circuit-${group.circuitId}`} className="border-l-4 border-primary rounded-lg overflow-hidden">
                    <div className="bg-primary/5 px-4 py-2 flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{group.circuitName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {group.circuitRounds} {group.circuitRounds === 1 ? "round" : "rounds"}
                      </Badge>
                    </div>
                    {group.items.map((sessionExercise) => {
                      const globalIndex = session.exercises!.indexOf(sessionExercise);
                      return renderExerciseCard(sessionExercise, globalIndex);
                    })}
                  </div>
                );
              }

              const sessionExercise = group.items[0];
              const globalIndex = session.exercises!.indexOf(sessionExercise);
              return renderExerciseCard(sessionExercise, globalIndex);
            });

            function renderExerciseCard(sessionExercise: SessionExerciseWithDetails, index: number) {
            const isExpanded = expandedExercise === sessionExercise.id;
            const completedSets = sessionExercise.performedSets?.length || 0;
            const plannedSetsCount = sessionExercise.plannedSets?.length || 0;
            const tracking = getTracking(sessionExercise.exercise);
            const units = getUnits(sessionExercise.exercise);
            const preFill = isActive ? getPreFillValues(sessionExercise, lastPerformance) : null;
            const preFillSummary = preFill ? formatPreFillSummary(preFill, tracking, units) : "";
            const lastSets = lastPerformance?.[sessionExercise.exerciseId];

            // Count enabled tracking fields (excluding rest which always shows)
            const enabledFields = [tracking.reps, tracking.weight, tracking.time, tracking.distance].filter(Boolean).length;
            const gridCols = enabledFields <= 2 ? "grid-cols-2" : "grid-cols-2";

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
                      <div className="flex items-center gap-1">
                        <p className="font-medium">{sessionExercise.exercise?.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {completedSets}{plannedSetsCount > 0 ? `/${plannedSetsCount}` : ""} sets
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
                    {/* Target (planned sets) */}
                    {sessionExercise.plannedSets && sessionExercise.plannedSets.length > 0 && (
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Target</p>
                        <div className="flex flex-wrap gap-2">
                          {sessionExercise.plannedSets.map((set) => (
                            <Badge key={set.id} variant="outline" className="text-xs">
                              {set.targetReps && `${set.targetReps}\u00d7`}
                              {set.targetWeight && `${set.targetWeight}${units.weight}`}
                              {set.targetTimeSeconds && `${fromStoredSeconds(set.targetTimeSeconds, units.time)}${units.time}`}
                              {(set as any).targetDistance && `${(set as any).targetDistance}${units.distance}`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Last Time */}
                    {lastSets && lastSets.length > 0 && (
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">Last Time</p>
                        <div className="flex flex-wrap gap-2">
                          {lastSets.map((set) => (
                            <Badge key={set.id} variant="outline" className="text-xs border-blue-200 dark:border-blue-800">
                              {set.actualReps && `${set.actualReps}\u00d7`}
                              {set.actualWeight && `${set.actualWeight}${units.weight}`}
                              {set.actualTimeSeconds && `${fromStoredSeconds(set.actualTimeSeconds, units.time)}${units.time}`}
                              {(set as any).actualDistance && `${(set as any).actualDistance}${units.distance}`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Performed sets with improvement indicators */}
                    {sessionExercise.performedSets && sessionExercise.performedSets.length > 0 && (
                      <div className="space-y-1">
                        {sessionExercise.performedSets.map((set) => {
                          // Compare against last session's matching set
                          const lastMatchingSet = lastSets?.find(s => s.setNumber === set.setNumber);
                          let indicator: "up" | "down" | null = null;
                          if (lastMatchingSet) {
                            const currentVolume = (set.actualReps || 0) * Number(set.actualWeight || 0);
                            const lastVolume = (lastMatchingSet.actualReps || 0) * Number(lastMatchingSet.actualWeight || 0);
                            if (currentVolume > 0 && lastVolume > 0) {
                              if (currentVolume > lastVolume) indicator = "up";
                              else if (currentVolume < lastVolume) indicator = "down";
                            }
                          }

                          if (editingSet?.setId === set.id) {
                            return (
                              <div key={set.id} className="space-y-3 p-3 border border-primary rounded-lg" data-testid={`edit-set-${set.id}`}>
                                <p className="text-xs font-medium text-muted-foreground">Edit Set {set.setNumber}</p>
                                <div className={`grid ${gridCols} gap-3`}>
                                  {tracking.reps && (
                                    <div className="space-y-1">
                                      <Label className="text-xs">Reps</Label>
                                      <Input
                                        type="number"
                                        inputMode="numeric"
                                        value={editingSet.reps}
                                        onChange={(e) => setEditingSet(prev => prev ? { ...prev, reps: e.target.value } : null)}
                                        className="h-12 text-lg"
                                      />
                                    </div>
                                  )}
                                  {tracking.weight && (
                                    <div className="space-y-1">
                                      <Label className="text-xs">Weight ({units.weight})</Label>
                                      <Input
                                        type="number"
                                        inputMode="decimal"
                                        value={editingSet.weight}
                                        onChange={(e) => setEditingSet(prev => prev ? { ...prev, weight: e.target.value } : null)}
                                        className="h-12 text-lg"
                                      />
                                    </div>
                                  )}
                                  {tracking.time && (
                                    <div className="space-y-1">
                                      <Label className="text-xs">Time ({units.time})</Label>
                                      <Input
                                        type="number"
                                        inputMode="numeric"
                                        value={editingSet.time}
                                        onChange={(e) => setEditingSet(prev => prev ? { ...prev, time: e.target.value } : null)}
                                        className="h-12 text-lg"
                                      />
                                    </div>
                                  )}
                                  {tracking.distance && (
                                    <div className="space-y-1">
                                      <Label className="text-xs">Distance ({units.distance})</Label>
                                      <Input
                                        type="number"
                                        inputMode="decimal"
                                        value={editingSet.distance}
                                        onChange={(e) => setEditingSet(prev => prev ? { ...prev, distance: e.target.value } : null)}
                                        className="h-12 text-lg"
                                      />
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Rest (sec)</Label>
                                  <Input
                                    type="number"
                                    inputMode="numeric"
                                    value={editingSet.rest}
                                    onChange={(e) => setEditingSet(prev => prev ? { ...prev, rest: e.target.value } : null)}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`edit-warmup-${set.id}`}
                                    checked={editingSet.isWarmup}
                                    onCheckedChange={(checked) => setEditingSet(prev => prev ? { ...prev, isWarmup: !!checked } : null)}
                                  />
                                  <Label htmlFor={`edit-warmup-${set.id}`} className="text-sm">Warmup</Label>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    className="flex-1"
                                    onClick={() => {
                                      const data: any = {};
                                      if (editingSet.reps) data.actualReps = parseInt(editingSet.reps);
                                      else data.actualReps = null;
                                      if (editingSet.weight) data.actualWeight = editingSet.weight;
                                      else data.actualWeight = null;
                                      if (editingSet.time) data.actualTimeSeconds = toStoredSeconds(editingSet.time, units.time);
                                      else data.actualTimeSeconds = null;
                                      if (editingSet.distance) data.actualDistance = editingSet.distance;
                                      else data.actualDistance = null;
                                      if (editingSet.rest) data.restSeconds = parseInt(editingSet.rest);
                                      else data.restSeconds = null;
                                      data.isWarmup = editingSet.isWarmup;
                                      updateSetMutation.mutate({
                                        sessionExerciseId: editingSet.sessionExerciseId,
                                        setId: editingSet.setId,
                                        data,
                                      });
                                    }}
                                    disabled={updateSetMutation.isPending}
                                  >
                                    <Save className="h-4 w-4 mr-2" />
                                    Save
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => {
                                      deleteSetMutation.mutate({
                                        sessionExerciseId: editingSet.sessionExerciseId,
                                        setId: editingSet.setId,
                                      });
                                    }}
                                    disabled={deleteSetMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" onClick={() => setEditingSet(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={set.id}
                              className={`flex items-center justify-between px-3 py-2 bg-green-50 dark:bg-green-950/20 rounded-lg text-sm ${isActive ? "cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/30" : ""}`}
                              data-testid={`row-set-${set.id}`}
                              onClick={() => {
                                if (!isActive) return;
                                setEditingSet({
                                  setId: set.id,
                                  sessionExerciseId: sessionExercise.id,
                                  reps: set.actualReps?.toString() || "",
                                  weight: set.actualWeight?.toString() || "",
                                  time: set.actualTimeSeconds ? fromStoredSeconds(set.actualTimeSeconds, units.time) : "",
                                  distance: (set as any).actualDistance?.toString() || "",
                                  rest: set.restSeconds?.toString() || "",
                                  isWarmup: set.isWarmup || false,
                                });
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-600" />
                                <span className="font-medium">Set {set.setNumber}</span>
                                {set.isWarmup && (
                                  <Badge variant="secondary" className="text-xs">warmup</Badge>
                                )}
                                {indicator === "up" && <ArrowUp className="h-3 w-3 text-green-600" />}
                                {indicator === "down" && <ArrowDown className="h-3 w-3 text-red-500" />}
                              </div>
                              <div className="flex items-center gap-3 text-muted-foreground">
                                {set.actualWeight && <span>{set.actualWeight} {units.weight}</span>}
                                {set.actualReps && <span>{set.actualReps} reps</span>}
                                {set.actualTimeSeconds && <span>{fromStoredSeconds(set.actualTimeSeconds, units.time)} {units.time}</span>}
                                {(set as any).actualDistance && <span>{(set as any).actualDistance} {units.distance}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add set controls */}
                    {isActive && (
                      <>
                        {addSetForm.exerciseId === sessionExercise.id ? (
                          <div className="space-y-3 p-3 border border-border rounded-lg">
                            <div className={`grid ${gridCols} gap-3`}>
                              {tracking.reps && (
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
                              )}
                              {tracking.weight && (
                                <div className="space-y-1">
                                  <Label className="text-xs">Weight ({units.weight})</Label>
                                  <Input
                                    type="number"
                                    inputMode="decimal"
                                    placeholder={units.weight === "kg" ? "60" : "135"}
                                    value={addSetForm.weight}
                                    onChange={(e) => setAddSetForm(prev => ({ ...prev, weight: e.target.value }))}
                                    className="h-12 text-lg"
                                    data-testid="input-actual-weight"
                                  />
                                </div>
                              )}
                              {tracking.time && (
                                <div className="space-y-1">
                                  <Label className="text-xs">Time ({units.time})</Label>
                                  <Input
                                    type="number"
                                    inputMode="numeric"
                                    placeholder={units.time === "min" ? "5" : "60"}
                                    value={addSetForm.time}
                                    onChange={(e) => setAddSetForm(prev => ({ ...prev, time: e.target.value }))}
                                    className="h-12 text-lg"
                                    data-testid="input-actual-time"
                                  />
                                </div>
                              )}
                              {tracking.distance && (
                                <div className="space-y-1">
                                  <Label className="text-xs">Distance ({units.distance})</Label>
                                  <Input
                                    type="number"
                                    inputMode="decimal"
                                    placeholder={units.distance === "km" ? "1.6" : "1.0"}
                                    value={addSetForm.distance}
                                    onChange={(e) => setAddSetForm(prev => ({ ...prev, distance: e.target.value }))}
                                    className="h-12 text-lg"
                                    data-testid="input-actual-distance"
                                  />
                                </div>
                              )}
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
                                onClick={() => handleAddSet(sessionExercise, completedSets)}
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
                          preFillSummary ? (
                            <div className="flex gap-2">
                              <Button
                                className="flex-1 h-12"
                                onClick={() => handleQuickLog(sessionExercise, preFill!)}
                                disabled={addSetMutation.isPending}
                                data-testid={`button-quick-log-${sessionExercise.id}`}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Log {preFillSummary}
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-12 w-12"
                                onClick={() => openFormWithPreFill(sessionExercise)}
                                data-testid={`button-edit-set-${sessionExercise.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
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
                          )
                        )}
                      </>
                    )}
                  </div>
                )}
              </Card>
            );
            }
          })()
        ) : (
          <EmptyState
            icon={Dumbbell}
            title="No exercises"
            description={isActive ? "Add an exercise to get started" : "This workout has no exercises"}
          />
        )}

        {isActive && (
          <Dialog open={addExerciseOpen} onOpenChange={(open) => {
            setAddExerciseOpen(open);
            if (!open) {
              setExerciseSearchQuery("");
              setCreateExerciseOpen(false);
              setNewExerciseName("");
              setNewExerciseCategory("");
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full h-12" data-testid="button-add-exercise">
                <Plus className="h-4 w-4 mr-2" />
                Add Exercise
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Exercise</DialogTitle>
              </DialogHeader>
              {createExerciseOpen ? (
                <div className="space-y-3 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCreateExerciseOpen(false)}
                    className="px-0"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to search
                  </Button>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-sm">Exercise Name</Label>
                      <Input
                        placeholder="e.g. Bulgarian Split Squat"
                        value={newExerciseName}
                        onChange={(e) => setNewExerciseName(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Category</Label>
                      <Select value={newExerciseCategory} onValueChange={setNewExerciseCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {exerciseCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => createExerciseMutation.mutate({ name: newExerciseName, category: newExerciseCategory })}
                      disabled={!newExerciseName.trim() || !newExerciseCategory || createExerciseMutation.isPending}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create & Add
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search exercises..."
                      value={exerciseSearchQuery}
                      onChange={(e) => setExerciseSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-exercise"
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto rounded-md border border-input">
                    {filteredExercises && filteredExercises.length > 0 ? (
                      filteredExercises.map((exercise) => (
                        <button
                          key={exercise.id}
                          onClick={() => addExerciseMutation.mutate(exercise.id)}
                          disabled={addExerciseMutation.isPending}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border last:border-b-0"
                          data-testid={`option-add-exercise-${exercise.id}`}
                        >
                          <div className="font-medium">{exercise.name}</div>
                          {exercise.category && (
                            <div className="text-xs text-muted-foreground">{exercise.category}</div>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center space-y-2">
                        <p className="text-sm text-muted-foreground">No exercises found</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewExerciseName(exerciseSearchQuery);
                            setCreateExerciseOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Create "{exerciseSearchQuery || "new exercise"}"
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setNewExerciseName(exerciseSearchQuery);
                      setCreateExerciseOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Exercise
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Rest Timer */}
      {restTimer !== null && (
        <RestTimer
          initialSeconds={restTimer}
          onComplete={() => setRestTimer(null)}
          onDismiss={() => setRestTimer(null)}
        />
      )}
    </div>
  );
}
