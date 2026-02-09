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
import { Plus, Repeat, Search, MoreVertical, Edit, Trash2, Copy, ArrowLeft, ChevronRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Circuit } from "@shared/schema";

const circuitCategories = [
  "Strength", "HIIT", "Superset", "EMOM", "Tabata", "Cardio", "Other"
];

interface CircuitWithCount extends Circuit {
  exerciseCount?: number;
}

export default function Circuits() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCircuit, setEditingCircuit] = useState<Circuit | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formRounds, setFormRounds] = useState("1");
  const [formRestBetweenExercises, setFormRestBetweenExercises] = useState("");
  const [formRestBetweenRounds, setFormRestBetweenRounds] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const { data: circuits, isLoading } = useQuery<CircuitWithCount[]>({
    queryKey: ["/api/circuits"],
  });

  const filteredCircuits = circuits?.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createCircuitMutation = useMutation({
    mutationFn: async (data: { name: string; category?: string; rounds: number; restBetweenExercisesSeconds?: number; restBetweenRoundsSeconds?: number; notes?: string }) => {
      return await apiRequest("POST", "/api/circuits", data) as Circuit;
    },
    onSuccess: (circuit) => {
      queryClient.invalidateQueries({ queryKey: ["/api/circuits"] });
      resetForm();
      navigate(`/circuit/${circuit.id}`);
    },
    onError: () => {
      toast({ title: "Failed to create circuit", variant: "destructive" });
    },
  });

  const updateCircuitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; category?: string; rounds: number; restBetweenExercisesSeconds?: number | null; restBetweenRoundsSeconds?: number | null; notes?: string } }) => {
      return await apiRequest("PATCH", `/api/circuits/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circuits"] });
      resetForm();
      toast({ title: "Circuit updated" });
    },
    onError: () => {
      toast({ title: "Failed to update circuit", variant: "destructive" });
    },
  });

  const deleteCircuitMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/circuits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circuits"] });
      toast({ title: "Circuit deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete circuit", variant: "destructive" });
    },
  });

  const copyCircuitMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/circuits/${id}/copy`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circuits"] });
      toast({ title: "Circuit copied" });
    },
    onError: () => {
      toast({ title: "Failed to copy circuit", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setDialogOpen(false);
    setEditingCircuit(null);
    setFormName("");
    setFormCategory("");
    setFormRounds("1");
    setFormRestBetweenExercises("");
    setFormRestBetweenRounds("");
    setFormNotes("");
  };

  const openEditDialog = (circuit: Circuit) => {
    setEditingCircuit(circuit);
    setFormName(circuit.name);
    setFormCategory(circuit.category || "");
    setFormRounds(String(circuit.rounds));
    setFormRestBetweenExercises(circuit.restBetweenExercisesSeconds ? String(circuit.restBetweenExercisesSeconds) : "");
    setFormRestBetweenRounds(circuit.restBetweenRoundsSeconds ? String(circuit.restBetweenRoundsSeconds) : "");
    setFormNotes(circuit.notes || "");
    setDialogOpen(true);
  };

  const handleSave = () => {
    const data = {
      name: formName,
      category: formCategory || undefined,
      rounds: parseInt(formRounds) || 1,
      restBetweenExercisesSeconds: formRestBetweenExercises ? parseInt(formRestBetweenExercises) : undefined,
      restBetweenRoundsSeconds: formRestBetweenRounds ? parseInt(formRestBetweenRounds) : undefined,
      notes: formNotes || undefined,
    };

    if (editingCircuit) {
      updateCircuitMutation.mutate({
        id: editingCircuit.id,
        data: {
          ...data,
          restBetweenExercisesSeconds: formRestBetweenExercises ? parseInt(formRestBetweenExercises) : null,
          restBetweenRoundsSeconds: formRestBetweenRounds ? parseInt(formRestBetweenRounds) : null,
        },
      });
    } else {
      createCircuitMutation.mutate(data);
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
            <h1 className="text-2xl font-bold tracking-tight">Circuit Library</h1>
            <p className="text-muted-foreground text-sm">Your reusable workout circuits</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search circuits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
          <DialogTrigger asChild>
            <Button className="w-full" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Circuit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCircuit ? "Edit Circuit" : "Create Circuit"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="circuit-name">Name</Label>
                <Input
                  id="circuit-name"
                  placeholder="e.g., Upper Body Superset, Tabata Burners"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="circuit-category">Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {circuitCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="circuit-rounds">Default Rounds</Label>
                  <Input
                    id="circuit-rounds"
                    type="number"
                    min="1"
                    value={formRounds}
                    onChange={(e) => setFormRounds(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="circuit-rest-exercises">Rest Between Ex. (s)</Label>
                  <Input
                    id="circuit-rest-exercises"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formRestBetweenExercises}
                    onChange={(e) => setFormRestBetweenExercises(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="circuit-rest-rounds">Rest Between Rds. (s)</Label>
                  <Input
                    id="circuit-rest-rounds"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formRestBetweenRounds}
                    onChange={(e) => setFormRestBetweenRounds(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="circuit-notes">Notes (optional)</Label>
                <Textarea
                  id="circuit-notes"
                  placeholder="Instructions, tips, etc."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSave}
                disabled={!formName.trim() || createCircuitMutation.isPending || updateCircuitMutation.isPending}
              >
                {editingCircuit ? "Save Changes" : "Create Circuit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <ListSkeleton count={5} />
        ) : filteredCircuits && filteredCircuits.length > 0 ? (
          <div className="space-y-2">
            {filteredCircuits.map((circuit) => (
              <Card key={circuit.id} className="p-4 hover-elevate">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/circuit/${circuit.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Repeat className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{circuit.name}</p>
                        {circuit.isSystem && (
                          <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary h-4 px-1">
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {circuit.category && (
                          <Badge variant="secondary" className="text-xs">
                            {circuit.category}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {circuit.exerciseCount || 0} exercises
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {circuit.rounds} {circuit.rounds === 1 ? "round" : "rounds"}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(circuit)}
                          disabled={circuit.isSystem}
                          className={circuit.isSystem ? "opacity-50" : ""}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit {circuit.isSystem && "(System Only)"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyCircuitMutation.mutate(circuit.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteCircuitMutation.mutate(circuit.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {circuit.isSystem ? "Remove from Library" : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Link href={`/circuit/${circuit.id}`}>
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
            title="No circuits found"
            description="Try a different search term"
          />
        ) : (
          <EmptyState
            icon={Repeat}
            title="No circuits yet"
            description="Create reusable exercise circuits to use in workouts"
            action={{
              label: "Create Circuit",
              onClick: () => setDialogOpen(true),
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
