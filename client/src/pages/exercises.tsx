import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ListSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Plus, Dumbbell, Search, MoreVertical, Edit, Trash2, Copy, ArrowLeft, ChevronRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Exercise } from "@shared/schema";

const categories = [
  "Push", "Pull", "Legs", "Core", "Cardio", "Olympic", "Other"
];

export default function Exercises() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const { data: exercises, isLoading } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises"],
  });

  const filteredExercises = exercises?.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createExerciseMutation = useMutation({
    mutationFn: async (data: { name: string; category?: string; notes?: string }) => {
      return await apiRequest("POST", "/api/exercises", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      resetForm();
      toast({ title: "Exercise created" });
    },
    onError: () => {
      toast({ title: "Failed to create exercise", variant: "destructive" });
    },
  });

  const updateExerciseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; category?: string; notes?: string } }) => {
      return await apiRequest("PATCH", `/api/exercises/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      resetForm();
      toast({ title: "Exercise updated" });
    },
    onError: () => {
      toast({ title: "Failed to update exercise", variant: "destructive" });
    },
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/exercises/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      toast({ title: "Exercise deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete exercise", variant: "destructive" });
    },
  });

  const copyExerciseMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/exercises/${id}/copy`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      toast({ title: "Exercise copied" });
    },
    onError: () => {
      toast({ title: "Failed to copy exercise", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setDialogOpen(false);
    setEditingExercise(null);
    setFormName("");
    setFormCategory("");
    setFormNotes("");
  };

  const openEditDialog = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setFormName(exercise.name);
    setFormCategory(exercise.category || "");
    setFormNotes(exercise.notes || "");
    setDialogOpen(true);
  };

  const handleSave = () => {
    const data = { 
      name: formName, 
      category: formCategory || undefined, 
      notes: formNotes || undefined 
    };
    
    if (editingExercise) {
      updateExerciseMutation.mutate({ id: editingExercise.id, data });
    } else {
      createExerciseMutation.mutate(data);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/plan">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Exercise Bank</h1>
            <p className="text-muted-foreground text-sm">Your personal exercise library</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
          <DialogTrigger asChild>
            <Button className="w-full" onClick={() => setDialogOpen(true)} data-testid="button-new-exercise">
              <Plus className="h-4 w-4 mr-2" />
              Add Exercise
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingExercise ? "Edit Exercise" : "Add Exercise"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="ex-name">Name</Label>
                <Input
                  id="ex-name"
                  placeholder="e.g., Bench Press, Squat"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  data-testid="input-exercise-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ex-category">Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ex-notes">Notes (optional)</Label>
                <Textarea
                  id="ex-notes"
                  placeholder="Form cues, variations, etc."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  data-testid="input-exercise-notes"
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handleSave}
                disabled={!formName.trim() || createExerciseMutation.isPending || updateExerciseMutation.isPending}
                data-testid="button-save-exercise"
              >
                {editingExercise ? "Save Changes" : "Add Exercise"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <ListSkeleton count={5} />
        ) : filteredExercises && filteredExercises.length > 0 ? (
          <div className="space-y-2">
            {filteredExercises.map((exercise) => (
              <Card 
                key={exercise.id} 
                className="p-4 hover-elevate"
                data-testid={`card-exercise-${exercise.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/exercise/${exercise.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{exercise.name}</p>
                      {exercise.category && (
                        <Badge variant="secondary" className="text-xs mt-0.5">
                          {exercise.category}
                        </Badge>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-menu-${exercise.id}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(exercise)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyExerciseMutation.mutate(exercise.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteExerciseMutation.mutate(exercise.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Link href={`/exercise/${exercise.id}`}>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : searchQuery ? (
          <EmptyState
            icon={Search}
            title="No exercises found"
            description="Try a different search term"
          />
        ) : (
          <EmptyState
            icon={Dumbbell}
            title="No exercises yet"
            description="Build your exercise library to use in workouts"
            action={{
              label: "Add Exercise",
              onClick: () => setDialogOpen(true),
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
