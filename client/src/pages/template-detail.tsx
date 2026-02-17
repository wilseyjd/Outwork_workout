import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageSkeleton, ListSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Dumbbell, ChevronUp, ChevronDown, Trash2, Edit, Save, X, Copy, Search, Repeat, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkoutTemplate, WorkoutTemplateExercise, PlannedSet, Exercise, Circuit } from "@shared/schema";

interface TemplateExerciseWithDetails extends WorkoutTemplateExercise {
  exercise?: Exercise;
  plannedSets?: PlannedSet[];
}

interface TemplateWithDetails extends WorkoutTemplate {
  exercises?: TemplateExerciseWithDetails[];
  circuits?: Record<string, Circuit>;
}

interface CircuitWithCount extends Circuit {
  exerciseCount?: number;
}

export default function TemplateDetail() {
  const [, params] = useRoute("/template/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const templateId = params?.id;

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addExerciseOpen, setAddExerciseOpen] = useState(false); // kept for compatibility
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [circuitSearchQuery, setCircuitSearchQuery] = useState("");
  const [circuitRoundsPicker, setCircuitRoundsPicker] = useState<{ circuitId: string; rounds: number } | null>(null);
  const [editingSets, setEditingSets] = useState<string | null>(null);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [setFormData, setSetFormData] = useState<{
    targetReps: string;
    targetWeight: string;
    targetTime: string;
    restSeconds: string;
    isWarmup: boolean;
  }>({
    targetReps: "",
    targetWeight: "",
    targetTime: "",
    restSeconds: "",
    isWarmup: false,
  });

  const { data: template, isLoading } = useQuery<TemplateWithDetails>({
    queryKey: ["/api/templates", templateId],
    enabled: !!templateId,
  });

  const { data: allExercises } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises"],
  });

  const { data: allCircuits } = useQuery<CircuitWithCount[]>({
    queryKey: ["/api/circuits"],
  });

  const addExerciseMutation = useMutation({
    mutationFn: async (exerciseId: string) => {
      return await apiRequest("POST", `/api/templates/${templateId}/exercises`, {
        exerciseId,
        position: (template?.exercises?.length || 0) + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates", templateId] });
      setAddExerciseOpen(false);
      toast({ title: "Exercise added" });
    },
    onError: () => {
      toast({ title: "Failed to add exercise", variant: "destructive" });
    },
  });

  const addCircuitMutation = useMutation({
    mutationFn: async ({ circuitId, rounds }: { circuitId: string; rounds: number }) => {
      return await apiRequest("POST", `/api/templates/${templateId}/circuits`, {
        circuitId,
        position: (template?.exercises?.length || 0) + 1,
        rounds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates", templateId] });
      setAddItemOpen(false);
      setCircuitRoundsPicker(null);
      toast({ title: "Circuit added" });
    },
    onError: () => {
      toast({ title: "Failed to add circuit", variant: "destructive" });
    },
  });

  const removeCircuitMutation = useMutation({
    mutationFn: async (circuitId: string) => {
      await apiRequest("DELETE", `/api/templates/${templateId}/circuits/${circuitId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates", templateId] });
      toast({ title: "Circuit removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove circuit", variant: "destructive" });
    },
  });

  const updateCircuitRoundsMutation = useMutation({
    mutationFn: async ({ circuitId, rounds }: { circuitId: string; rounds: number }) => {
      await apiRequest("PATCH", `/api/templates/${templateId}/circuits/${circuitId}`, { rounds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates", templateId] });
      toast({ title: "Rounds updated" });
    },
    onError: () => {
      toast({ title: "Failed to update rounds", variant: "destructive" });
    },
  });

  const removeExerciseMutation = useMutation({
    mutationFn: async (templateExerciseId: string) => {
      await apiRequest("DELETE", `/api/templates/${templateId}/exercises/${templateExerciseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates", templateId] });
      toast({ title: "Exercise removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove exercise", variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (exerciseIds: string[]) => {
      await apiRequest("PATCH", `/api/templates/${templateId}/exercises/reorder`, { exerciseIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates", templateId] });
    },
    onError: () => {
      toast({ title: "Failed to reorder exercises", variant: "destructive" });
    },
  });

  const moveExercise = (index: number, direction: "up" | "down") => {
    if (!template?.exercises) return;
    const exercises = [...template.exercises];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= exercises.length) return;

    [exercises[index], exercises[newIndex]] = [exercises[newIndex], exercises[index]];
    const exerciseIds = exercises.map(e => e.id);
    reorderMutation.mutate(exerciseIds);
  };

  const addSetMutation = useMutation({
    mutationFn: async ({ templateExerciseId, data }: {
      templateExerciseId: string;
      data: {
        setNumber: number;
        targetReps?: number;
        targetWeight?: string;
        targetTimeSeconds?: number;
        restSeconds?: number;
        isWarmup?: boolean;
      }
    }) => {
      return await apiRequest("POST", `/api/templates/${templateId}/exercises/${templateExerciseId}/sets`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates", templateId] });
      resetSetForm();
      toast({ title: "Set added" });
    },
    onError: () => {
      toast({ title: "Failed to add set", variant: "destructive" });
    },
  });

  const deleteSetMutation = useMutation({
    mutationFn: async ({ templateExerciseId, setId }: { templateExerciseId: string; setId: string }) => {
      await apiRequest("DELETE", `/api/templates/${templateId}/exercises/${templateExerciseId}/sets/${setId}`);
    },
    onSuccess: (_, variables) => {
      const { templateExerciseId, setId } = variables;
      queryClient.invalidateQueries({ queryKey: ["/api/templates", templateId] });

      // Calculate remaining set IDs and trigger reorder
      const templateExercise = template?.exercises?.find(te => te.id === templateExerciseId);
      if (templateExercise && templateExercise.plannedSets) {
        const remainingSetIds = templateExercise.plannedSets
          .filter(s => s.id !== setId)
          .map(s => s.id);

        reorderSetsMutation.mutate({ templateExerciseId, setIds: remainingSetIds });
      }

      toast({ title: "Set removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove set", variant: "destructive" });
    },
  });

  const reorderSetsMutation = useMutation({
    mutationFn: async ({ templateExerciseId, setIds }: { templateExerciseId: string; setIds: string[] }) => {
      await apiRequest("POST", `/api/templates/${templateId}/exercises/${templateExerciseId}/sets/reorder`, { setIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates", templateId] });
    },
  });

  // Re-write deleteSetMutation to be cleaner and trigger reorder
  // I need to be careful because invalidateQueries is async.
  // Better approach: handle reorder in a separate effect or just call it directly if data is available.

  const updateSetMutation = useMutation({
    mutationFn: async ({ templateExerciseId, setId, data }: {
      templateExerciseId: string;
      setId: string;
      data: {
        targetReps?: number;
        targetWeight?: string;
        targetTimeSeconds?: number;
        restSeconds?: number;
        isWarmup?: boolean;
      }
    }) => {
      return await apiRequest("PATCH", `/api/templates/${templateId}/exercises/${templateExerciseId}/sets/${setId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates", templateId] });
      resetSetForm();
      toast({ title: "Set updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update set",
        description: error.message || "Unknown error",
        variant: "destructive"
      });
    },
  });

  const duplicateSetMutation = useMutation({
    mutationFn: async ({ templateExerciseId, set, currentSets }: {
      templateExerciseId: string;
      set: PlannedSet;
      currentSets: PlannedSet[];
    }) => {
      const nextSetNumber = Math.max(...currentSets.map(s => s.setNumber), 0) + 1;
      const data: any = { setNumber: nextSetNumber };
      if (set.targetReps) data.targetReps = set.targetReps;
      if (set.targetWeight) data.targetWeight = set.targetWeight;
      if (set.targetTimeSeconds) data.targetTimeSeconds = set.targetTimeSeconds;
      if (set.restSeconds) data.restSeconds = set.restSeconds;
      data.isWarmup = set.isWarmup;
      return await apiRequest("POST", `/api/templates/${templateId}/exercises/${templateExerciseId}/sets`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates", templateId] });
      toast({ title: "Set duplicated" });
    },
    onError: () => {
      toast({ title: "Failed to duplicate set", variant: "destructive" });
    },
  });

  const resetSetForm = () => {
    setEditingSets(null);
    setEditingSetId(null);
    setSetFormData({
      targetReps: "",
      targetWeight: "",
      targetTime: "",
      restSeconds: "",
      isWarmup: false,
    });
  };

  const handleAddSet = (templateExerciseId: string, currentSets: PlannedSet[]) => {
    const nextSetNumber = Math.max(...currentSets.map(s => s.setNumber), 0) + 1;
    const data: any = {
      setNumber: nextSetNumber,
    };

    if (setFormData.targetReps) data.targetReps = parseInt(setFormData.targetReps);
    if (setFormData.targetWeight) data.targetWeight = setFormData.targetWeight;
    if (setFormData.targetTime) data.targetTimeSeconds = parseInt(setFormData.targetTime);
    if (setFormData.restSeconds) data.restSeconds = parseInt(setFormData.restSeconds);
    data.isWarmup = setFormData.isWarmup;

    addSetMutation.mutate({ templateExerciseId, data });
  };

  const handleEditSet = (set: PlannedSet) => {
    setEditingSetId(set.id);
    setSetFormData({
      targetReps: set.targetReps?.toString() || "",
      targetWeight: set.targetWeight || "",
      targetTime: set.targetTimeSeconds?.toString() || "",
      restSeconds: set.restSeconds?.toString() || "",
      isWarmup: set.isWarmup || false,
    });
  };

  const handleUpdateSet = (templateExerciseId: string, setId: string) => {
    const data: any = {};

    // Only add numeric fields if they have valid values
    const reps = parseInt(setFormData.targetReps);
    if (!isNaN(reps) && setFormData.targetReps) data.targetReps = reps;

    if (setFormData.targetWeight && setFormData.targetWeight.trim()) {
      data.targetWeight = setFormData.targetWeight;
    }

    const time = parseInt(setFormData.targetTime);
    if (!isNaN(time) && setFormData.targetTime) data.targetTimeSeconds = time;

    const rest = parseInt(setFormData.restSeconds);
    if (!isNaN(rest) && setFormData.restSeconds) data.restSeconds = rest;

    data.isWarmup = setFormData.isWarmup;

    console.log("Updating set with data:", data);
    updateSetMutation.mutate({ templateExerciseId, setId, data });
  };

  const availableExercises = allExercises?.filter(
    ex => !template?.exercises?.some(te => te.exerciseId === ex.id)
  ).filter(ex =>
    ex.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
    ex.category?.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
  );

  const renderSetsUI = (templateExercise: TemplateExerciseWithDetails) => (
    <div className="space-y-2">
      {templateExercise.plannedSets && templateExercise.plannedSets.length > 0 && (
        <div className="space-y-1">
          {templateExercise.plannedSets.map((set) => (
            editingSetId === set.id ? (
              <div key={set.id} className="space-y-3 p-3 border border-border rounded-lg bg-background">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Edit Set #{set.setNumber}</span>
                  {set.isWarmup && (
                    <span className="text-xs text-muted-foreground">(warmup)</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Reps</Label>
                    <Input
                      type="number"
                      placeholder="10"
                      value={setFormData.targetReps}
                      onChange={(e) => setSetFormData(prev => ({ ...prev, targetReps: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Weight (lbs)</Label>
                    <Input
                      type="number"
                      placeholder="135"
                      value={setFormData.targetWeight}
                      onChange={(e) => setSetFormData(prev => ({ ...prev, targetWeight: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Time (sec)</Label>
                    <Input
                      type="number"
                      placeholder="60"
                      value={setFormData.targetTime}
                      onChange={(e) => setSetFormData(prev => ({ ...prev, targetTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Rest (sec)</Label>
                    <Input
                      type="number"
                      placeholder="90"
                      value={setFormData.restSeconds}
                      onChange={(e) => setSetFormData(prev => ({ ...prev, restSeconds: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`edit-warmup-${set.id}`}
                    checked={setFormData.isWarmup}
                    onCheckedChange={(checked) => setSetFormData(prev => ({ ...prev, isWarmup: !!checked }))}
                  />
                  <Label htmlFor={`edit-warmup-${set.id}`} className="text-sm">Warmup set</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUpdateSet(templateExercise.id, set.id)}
                    disabled={updateSetMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetSetForm}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                key={set.id}
                className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium w-6">#{set.setNumber}</span>
                  {set.isWarmup && (
                    <span className="text-xs text-muted-foreground">(warmup)</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  {set.targetReps && <span>{set.targetReps} reps</span>}
                  {set.targetWeight && <span>{set.targetWeight} lbs</span>}
                  {set.targetTimeSeconds && <span>{set.targetTimeSeconds}s</span>}
                  {set.restSeconds && <span className="text-xs">Rest: {set.restSeconds}s</span>}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleEditSet(set)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => duplicateSetMutation.mutate({
                        templateExerciseId: templateExercise.id,
                        set,
                        currentSets: templateExercise.plannedSets || []
                      })}
                      disabled={duplicateSetMutation.isPending}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => deleteSetMutation.mutate({
                        templateExerciseId: templateExercise.id,
                        setId: set.id
                      })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {editingSets === templateExercise.id ? (
        <div className="space-y-3 p-3 border border-border rounded-lg bg-background">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Reps</Label>
              <Input
                type="number"
                placeholder="10"
                value={setFormData.targetReps}
                onChange={(e) => setSetFormData(prev => ({ ...prev, targetReps: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Weight (lbs)</Label>
              <Input
                type="number"
                placeholder="135"
                value={setFormData.targetWeight}
                onChange={(e) => setSetFormData(prev => ({ ...prev, targetWeight: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Time (sec)</Label>
              <Input
                type="number"
                placeholder="60"
                value={setFormData.targetTime}
                onChange={(e) => setSetFormData(prev => ({ ...prev, targetTime: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Rest (sec)</Label>
              <Input
                type="number"
                placeholder="90"
                value={setFormData.restSeconds}
                onChange={(e) => setSetFormData(prev => ({ ...prev, restSeconds: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`warmup-${templateExercise.id}`}
              checked={setFormData.isWarmup}
              onCheckedChange={(checked) => setSetFormData(prev => ({ ...prev, isWarmup: !!checked }))}
            />
            <Label htmlFor={`warmup-${templateExercise.id}`} className="text-sm">Warmup set</Label>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleAddSet(templateExercise.id, templateExercise.plannedSets || [])}
              disabled={addSetMutation.isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              Add Set
            </Button>
            <Button size="sm" variant="outline" onClick={resetSetForm}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            // Pre-fill with last set's values (carries circuit defaults forward)
            const lastSet = templateExercise.plannedSets?.length
              ? templateExercise.plannedSets[templateExercise.plannedSets.length - 1]
              : null;
            if (lastSet) {
              setSetFormData({
                targetReps: lastSet.targetReps?.toString() || "",
                targetWeight: lastSet.targetWeight || "",
                targetTime: lastSet.targetTimeSeconds?.toString() || "",
                restSeconds: lastSet.restSeconds?.toString() || "",
                isWarmup: false,
              });
            }
            setEditingSets(templateExercise.id);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Set
        </Button>
      )}
    </div>
  );

  const filteredCircuits = allCircuits?.filter(c =>
    c.name.toLowerCase().includes(circuitSearchQuery.toLowerCase()) ||
    c.category?.toLowerCase().includes(circuitSearchQuery.toLowerCase())
  );

  // Group exercises by circuit for display
  const groupExercises = (exercises: TemplateExerciseWithDetails[]) => {
    const groups: Array<{
      type: "exercise" | "circuit";
      circuitId?: string;
      circuitName?: string;
      circuitRounds?: number;
      items: TemplateExerciseWithDetails[];
    }> = [];

    let currentCircuitId: string | null = null;
    let currentGroup: typeof groups[0] | null = null;

    for (const ex of exercises) {
      if (ex.circuitId) {
        if (ex.circuitId !== currentCircuitId) {
          currentCircuitId = ex.circuitId;
          currentGroup = {
            type: "circuit",
            circuitId: ex.circuitId,
            circuitName: template?.circuits?.[ex.circuitId]?.name || "Circuit",
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

    return groups;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <PageSkeleton />
      </AppLayout>
    );
  }

  if (!template) {
    return (
      <AppLayout>
        <EmptyState
          icon={Dumbbell}
          title="Template not found"
          description="This template doesn't exist or was deleted"
          action={{
            label: "Go back",
            onClick: () => navigate("/plan"),
          }}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/plan">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate" data-testid="text-template-name">
              {template.name}
            </h1>
            {template.notes && (
              <p className="text-muted-foreground text-sm truncate">{template.notes}</p>
            )}
          </div>
        </div>

        <Dialog open={addItemOpen} onOpenChange={(open) => {
          setAddItemOpen(open);
          if (!open) {
            setCircuitRoundsPicker(null);
            setExerciseSearchQuery("");
            setCircuitSearchQuery("");
          }
        }}>
          <DialogTrigger asChild>
            <Button className="w-full" data-testid="button-add-exercise">
              <Plus className="h-4 w-4 mr-2" />
              Add Exercise or Circuit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add to Workout</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="exercises" className="pt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="exercises">Exercises</TabsTrigger>
                <TabsTrigger value="circuits">Circuits</TabsTrigger>
              </TabsList>
              <TabsContent value="exercises" className="space-y-4 pt-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search exercises..."
                    value={exerciseSearchQuery}
                    onChange={(e) => setExerciseSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {availableExercises && availableExercises.length > 0 ? (
                    availableExercises.map((exercise) => (
                      <button
                        key={exercise.id}
                        onClick={() => addExerciseMutation.mutate(exercise.id)}
                        disabled={addExerciseMutation.isPending}
                        className="w-full p-3 rounded-lg border border-border hover:bg-muted text-left transition-colors"
                        data-testid={`button-select-${exercise.id}`}
                      >
                        <p className="font-medium">{exercise.name}</p>
                        {exercise.category && (
                          <p className="text-sm text-muted-foreground">{exercise.category}</p>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No more exercises to add</p>
                    </div>
                  )}
                  <div className="text-center py-4 border-t mt-4">
                    <Button variant="ghost" asChild className="text-primary hover:underline h-auto p-0 font-normal">
                      <Link href="/exercises">Create new exercise</Link>
                    </Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="circuits" className="space-y-4 pt-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search circuits..."
                    value={circuitSearchQuery}
                    onChange={(e) => setCircuitSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {circuitRoundsPicker ? (
                    <div className="space-y-4 p-4 border rounded-lg">
                      <p className="font-medium text-sm">
                        How many rounds for this circuit?
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCircuitRoundsPicker(prev => prev ? { ...prev, rounds: Math.max(1, prev.rounds - 1) } : null)}
                          disabled={circuitRoundsPicker.rounds <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-2xl font-bold w-12 text-center">{circuitRoundsPicker.rounds}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCircuitRoundsPicker(prev => prev ? { ...prev, rounds: prev.rounds + 1 } : null)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => addCircuitMutation.mutate({
                            circuitId: circuitRoundsPicker.circuitId,
                            rounds: circuitRoundsPicker.rounds,
                          })}
                          disabled={addCircuitMutation.isPending}
                        >
                          Add Circuit
                        </Button>
                        <Button variant="outline" onClick={() => setCircuitRoundsPicker(null)}>
                          Back
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {filteredCircuits && filteredCircuits.length > 0 ? (
                        filteredCircuits.map((circuit) => (
                          <button
                            key={circuit.id}
                            onClick={() => setCircuitRoundsPicker({ circuitId: circuit.id, rounds: circuit.rounds })}
                            className="w-full p-3 rounded-lg border border-border hover:bg-muted text-left transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Repeat className="h-4 w-4 text-primary flex-shrink-0" />
                              <div>
                                <p className="font-medium">{circuit.name}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {circuit.category && <span>{circuit.category}</span>}
                                  <span>{circuit.exerciseCount || 0} exercises</span>
                                  <span>{circuit.rounds} rounds default</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No circuits available</p>
                        </div>
                      )}
                      <div className="text-center py-4 border-t mt-4">
                        <Button variant="ghost" asChild className="text-primary hover:underline h-auto p-0 font-normal">
                          <Link href="/circuits">Create new circuit</Link>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {template.exercises && template.exercises.length > 0 ? (
          <div className="space-y-4">
            {groupExercises(template.exercises).map((group, groupIndex) => {
              if (group.type === "circuit") {
                return (
                  <div key={`circuit-${group.circuitId}`} className="border-l-4 border-primary rounded-lg overflow-hidden">
                    <div className="bg-primary/5 px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Repeat className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{group.circuitName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {group.circuitRounds} {group.circuitRounds === 1 ? "round" : "rounds"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateCircuitRoundsMutation.mutate({
                            circuitId: group.circuitId!,
                            rounds: Math.max(1, (group.circuitRounds || 1) - 1),
                          })}
                          disabled={(group.circuitRounds || 1) <= 1 || updateCircuitRoundsMutation.isPending}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs font-medium w-4 text-center">{group.circuitRounds}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateCircuitRoundsMutation.mutate({
                            circuitId: group.circuitId!,
                            rounds: (group.circuitRounds || 1) + 1,
                          })}
                          disabled={updateCircuitRoundsMutation.isPending}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeCircuitMutation.mutate(group.circuitId!)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-0">
                      {group.items.map((templateExercise) => {
                        const globalIndex = template.exercises!.indexOf(templateExercise);
                        return (
                          <Card key={templateExercise.id} className="p-4 rounded-none border-x-0 border-t-0 last:border-b-0" data-testid={`card-exercise-${templateExercise.id}`}>
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                                  {globalIndex + 1}
                                </div>
                                <div>
                                  <p className="font-medium">{templateExercise.exercise?.name}</p>
                                  <div className="flex items-center gap-1">
                                    {templateExercise.exercise?.category && (
                                      <span className="text-xs text-muted-foreground">{templateExercise.exercise.category}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            {renderSetsUI(templateExercise)}
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              const templateExercise = group.items[0];
              const index = template.exercises!.indexOf(templateExercise);
              return (
              <Card key={templateExercise.id} className="p-4" data-testid={`card-exercise-${templateExercise.id}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0 || reorderMutation.isPending}
                        onClick={() => moveExercise(index, "up")}
                        data-testid={`button-move-up-${templateExercise.id}`}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === (template.exercises?.length || 1) - 1 || reorderMutation.isPending}
                        onClick={() => moveExercise(index, "down")}
                        data-testid={`button-move-down-${templateExercise.id}`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{templateExercise.exercise?.name}</p>
                      {templateExercise.exercise?.category && (
                        <p className="text-xs text-muted-foreground">{templateExercise.exercise.category}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExerciseMutation.mutate(templateExercise.id)}
                    className="text-muted-foreground hover:text-destructive"
                    data-testid={`button-remove-${templateExercise.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {renderSetsUI(templateExercise)}
              </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Dumbbell}
            title="No exercises yet"
            description="Add exercises to build your workout template"
            action={{
              label: "Add Exercise or Circuit",
              onClick: () => setAddItemOpen(true),
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
