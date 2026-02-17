import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ArrowLeft, Plus, Dumbbell, ChevronUp, ChevronDown, Trash2, Search, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Circuit, CircuitExercise, Exercise } from "@shared/schema";

interface CircuitExerciseWithDetails extends CircuitExercise {
  exercise?: Exercise;
}

interface CircuitWithDetails extends Circuit {
  exercises?: CircuitExerciseWithDetails[];
}

export default function CircuitDetail() {
  const [, params] = useRoute("/circuit/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const circuitId = params?.id;

  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [editingRestId, setEditingRestId] = useState<string | null>(null);
  const [restValue, setRestValue] = useState("");


  const { data: circuit, isLoading } = useQuery<CircuitWithDetails>({
    queryKey: ["/api/circuits", circuitId],
    enabled: !!circuitId,
  });

  const { data: allExercises } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises"],
  });

  const addExerciseMutation = useMutation({
    mutationFn: async (exerciseId: string) => {
      return await apiRequest("POST", `/api/circuits/${circuitId}/exercises`, {
        exerciseId,
        position: (circuit?.exercises?.length || 0) + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circuits", circuitId] });
      setAddExerciseOpen(false);
      toast({ title: "Exercise added" });
    },
    onError: () => {
      toast({ title: "Failed to add exercise", variant: "destructive" });
    },
  });

  const removeExerciseMutation = useMutation({
    mutationFn: async (circuitExerciseId: string) => {
      await apiRequest("DELETE", `/api/circuits/${circuitId}/exercises/${circuitExerciseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circuits", circuitId] });
      toast({ title: "Exercise removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove exercise", variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (exerciseIds: string[]) => {
      await apiRequest("PATCH", `/api/circuits/${circuitId}/exercises/reorder`, { exerciseIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circuits", circuitId] });
    },
    onError: () => {
      toast({ title: "Failed to reorder exercises", variant: "destructive" });
    },
  });

  const updateExerciseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return await apiRequest("PATCH", `/api/circuits/${circuitId}/exercises/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circuits", circuitId] });
      setEditingRestId(null);
    },
    onError: () => {
      toast({ title: "Failed to update exercise", variant: "destructive" });
    },
  });

  const moveExercise = (index: number, direction: "up" | "down") => {
    if (!circuit?.exercises) return;
    const exercises = [...circuit.exercises];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= exercises.length) return;

    [exercises[index], exercises[newIndex]] = [exercises[newIndex], exercises[index]];
    const exerciseIds = exercises.map(e => e.id);
    reorderMutation.mutate(exerciseIds);
  };

  const filteredExercises = allExercises?.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
      e.category?.toLowerCase().includes(exerciseSearchQuery.toLowerCase());
    const alreadyAdded = circuit?.exercises?.some(ce => ce.exerciseId === e.id);
    return matchesSearch && !alreadyAdded;
  });

  if (isLoading) {
    return <AppLayout><PageSkeleton /></AppLayout>;
  }

  if (!circuit) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Circuit not found</p>
          <Button variant="ghost" asChild className="mt-2">
            <Link href="/circuits">Back to Circuits</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/circuits">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">{circuit.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {circuit.category && (
                <Badge variant="secondary" className="text-xs">{circuit.category}</Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {circuit.rounds} {circuit.rounds === 1 ? "round" : "rounds"}
              </span>
              {circuit.restBetweenExercisesSeconds && (
                <span className="text-sm text-muted-foreground">
                  {circuit.restBetweenExercisesSeconds}s rest
                </span>
              )}
            </div>
          </div>
        </div>

        {circuit.notes && (
          <Card className="p-3">
            <p className="text-sm text-muted-foreground">{circuit.notes}</p>
          </Card>
        )}

        {/* Exercise List */}
        {circuit.exercises && circuit.exercises.length > 0 ? (
          <div className="space-y-2">
            {circuit.exercises.map((ce, index) => (
              <Card key={ce.id} className="p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveExercise(index, "up")}
                      disabled={index === 0 || circuit.isSystem}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveExercise(index, "down")}
                      disabled={index === (circuit.exercises?.length || 0) - 1 || circuit.isSystem}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <Badge variant="outline" className="h-7 w-7 rounded-full flex items-center justify-center p-0 text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </Badge>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ce.exercise?.name || "Unknown"}</p>
                    {ce.exercise?.category && (
                      <Badge variant="secondary" className="text-xs mt-0.5">{ce.exercise.category}</Badge>
                    )}
                  </div>

                  {/* Rest after this exercise */}
                  <div className="flex items-center gap-2">
                    {editingRestId === ce.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          className="w-16 h-7 text-xs"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={restValue}
                          onChange={(e) => setRestValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateExerciseMutation.mutate({
                                id: ce.id,
                                data: { restAfterSeconds: restValue ? parseInt(restValue) : null },
                              });
                            }
                            if (e.key === "Escape") setEditingRestId(null);
                          }}
                          autoFocus
                        />
                        <span className="text-xs text-muted-foreground">s</span>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => {
                          setEditingRestId(ce.id);
                          setRestValue(ce.restAfterSeconds?.toString() || "");
                        }}
                        disabled={circuit.isSystem}
                      >
                        {ce.restAfterSeconds ? `${ce.restAfterSeconds}s rest` : "No rest"}
                      </Button>
                    )}

                    {!circuit.isSystem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeExerciseMutation.mutate(ce.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Default values row - inline autosave on blur */}
                {!circuit.isSystem && (
                  <div className="flex items-center gap-2 ml-[72px]">
                    <div className="flex items-center gap-1">
                      <Input
                        className="w-16 h-7 text-xs"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="—"
                        defaultValue={ce.defaultReps?.toString() || ""}
                        onBlur={(e) => {
                          const val = e.target.value ? parseInt(e.target.value) : null;
                          if (val !== (ce.defaultReps ?? null)) {
                            updateExerciseMutation.mutate({ id: ce.id, data: { defaultReps: val } });
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground">reps</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        className="w-16 h-7 text-xs"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        placeholder="—"
                        defaultValue={ce.defaultWeight?.toString() || ""}
                        onBlur={(e) => {
                          const val = e.target.value || null;
                          if (val !== (ce.defaultWeight ?? null)) {
                            updateExerciseMutation.mutate({ id: ce.id, data: { defaultWeight: val } });
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground">lbs</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        className="w-16 h-7 text-xs"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="—"
                        defaultValue={ce.defaultTimeSeconds?.toString() || ""}
                        onBlur={(e) => {
                          const val = e.target.value ? parseInt(e.target.value) : null;
                          if (val !== (ce.defaultTimeSeconds ?? null)) {
                            updateExerciseMutation.mutate({ id: ce.id, data: { defaultTimeSeconds: val } });
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground">s</span>
                    </div>
                  </div>
                )}
                {circuit.isSystem && (
                  <div className="flex items-center gap-1.5 ml-[72px] text-xs text-muted-foreground">
                    <span>Defaults:</span>
                    <span>{ce.defaultReps ? `${ce.defaultReps} reps` : "—"}</span>
                    <span>·</span>
                    <span>{ce.defaultWeight ? `${ce.defaultWeight} lbs` : "—"}</span>
                    <span>·</span>
                    <span>{ce.defaultTimeSeconds ? `${ce.defaultTimeSeconds}s` : "—"}</span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Dumbbell}
            title="No exercises yet"
            description="Add exercises to build your circuit"
          />
        )}

        {/* Add Exercise Button */}
        {!circuit.isSystem && (
          <Dialog open={addExerciseOpen} onOpenChange={setAddExerciseOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Exercise
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Exercise to Circuit</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search exercises..."
                    value={exerciseSearchQuery}
                    onChange={(e) => setExerciseSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredExercises?.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => addExerciseMutation.mutate(exercise.id)}
                      className="w-full p-3 rounded-lg border text-left hover:bg-muted transition-colors"
                    >
                      <p className="font-medium">{exercise.name}</p>
                      {exercise.category && (
                        <Badge variant="secondary" className="text-xs mt-1">{exercise.category}</Badge>
                      )}
                    </button>
                  ))}
                  {filteredExercises?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No exercises found</p>
                  )}
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/exercises">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Exercise
                  </Link>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}
