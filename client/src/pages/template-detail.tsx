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
import { ArrowLeft, Plus, Dumbbell, GripVertical, Trash2, Edit, Save, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkoutTemplate, WorkoutTemplateExercise, PlannedSet, Exercise } from "@shared/schema";

interface TemplateExerciseWithDetails extends WorkoutTemplateExercise {
  exercise?: Exercise;
  plannedSets?: PlannedSet[];
}

interface TemplateWithDetails extends WorkoutTemplate {
  exercises?: TemplateExerciseWithDetails[];
}

export default function TemplateDetail() {
  const [, params] = useRoute("/template/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const templateId = params?.id;

  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [editingSets, setEditingSets] = useState<string | null>(null);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates", templateId] });
      toast({ title: "Set removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove set", variant: "destructive" });
    },
  });

  const resetSetForm = () => {
    setEditingSets(null);
    setSetFormData({
      targetReps: "",
      targetWeight: "",
      targetTime: "",
      restSeconds: "",
      isWarmup: false,
    });
  };

  const handleAddSet = (templateExerciseId: string, currentSetsCount: number) => {
    const data: any = {
      setNumber: currentSetsCount + 1,
    };
    
    if (setFormData.targetReps) data.targetReps = parseInt(setFormData.targetReps);
    if (setFormData.targetWeight) data.targetWeight = setFormData.targetWeight;
    if (setFormData.targetTime) data.targetTimeSeconds = parseInt(setFormData.targetTime);
    if (setFormData.restSeconds) data.restSeconds = parseInt(setFormData.restSeconds);
    data.isWarmup = setFormData.isWarmup;

    addSetMutation.mutate({ templateExerciseId, data });
  };

  const availableExercises = allExercises?.filter(
    ex => !template?.exercises?.some(te => te.exerciseId === ex.id)
  );

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

        <Dialog open={addExerciseOpen} onOpenChange={setAddExerciseOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" data-testid="button-add-exercise">
              <Plus className="h-4 w-4 mr-2" />
              Add Exercise
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Exercise</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 pt-4">
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
                  <Button variant="link" asChild className="mt-2">
                    <Link href="/exercises">Create new exercise</Link>
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {template.exercises && template.exercises.length > 0 ? (
          <div className="space-y-4">
            {template.exercises.map((templateExercise, index) => (
              <Card key={templateExercise.id} className="p-4" data-testid={`card-exercise-${templateExercise.id}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
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

                <div className="space-y-2">
                  {templateExercise.plannedSets && templateExercise.plannedSets.length > 0 && (
                    <div className="space-y-1">
                      {templateExercise.plannedSets.map((set) => (
                        <div 
                          key={set.id} 
                          className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg text-sm"
                          data-testid={`row-set-${set.id}`}
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
                            data-testid="input-reps"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Weight (lbs)</Label>
                          <Input
                            type="number"
                            placeholder="135"
                            value={setFormData.targetWeight}
                            onChange={(e) => setSetFormData(prev => ({ ...prev, targetWeight: e.target.value }))}
                            data-testid="input-weight"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Time (sec)</Label>
                          <Input
                            type="number"
                            placeholder="60"
                            value={setFormData.targetTime}
                            onChange={(e) => setSetFormData(prev => ({ ...prev, targetTime: e.target.value }))}
                            data-testid="input-time"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Rest (sec)</Label>
                          <Input
                            type="number"
                            placeholder="90"
                            value={setFormData.restSeconds}
                            onChange={(e) => setSetFormData(prev => ({ ...prev, restSeconds: e.target.value }))}
                            data-testid="input-rest"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`warmup-${templateExercise.id}`}
                          checked={setFormData.isWarmup}
                          onCheckedChange={(checked) => setSetFormData(prev => ({ ...prev, isWarmup: !!checked }))}
                          data-testid="checkbox-warmup"
                        />
                        <Label htmlFor={`warmup-${templateExercise.id}`} className="text-sm">Warmup set</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAddSet(templateExercise.id, templateExercise.plannedSets?.length || 0)}
                          disabled={addSetMutation.isPending}
                          data-testid="button-save-set"
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
                      onClick={() => setEditingSets(templateExercise.id)}
                      data-testid={`button-add-set-${templateExercise.id}`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Set
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Dumbbell}
            title="No exercises yet"
            description="Add exercises to build your workout template"
            action={{
              label: "Add Exercise",
              onClick: () => setAddExerciseOpen(true),
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
