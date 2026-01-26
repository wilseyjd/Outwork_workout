import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Plus, Pill, Check, Clock, MoreVertical, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, isToday, parseISO } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Supplement, SupplementLog, SupplementScheduleItem } from "@shared/schema";

interface SupplementWithSchedule extends Supplement {
  schedules?: SupplementScheduleItem[];
  todayLog?: SupplementLog;
}

export default function Supplements() {
  const { toast } = useToast();
  const [newSupplementOpen, setNewSupplementOpen] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState<Supplement | null>(null);
  const [editingLog, setEditingLog] = useState<SupplementLog | null>(null);
  const [formName, setFormName] = useState("");
  const [formDose, setFormDose] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [logFormDose, setLogFormDose] = useState("");
  const [logFormDate, setLogFormDate] = useState("");
  const [logFormTime, setLogFormTime] = useState("");

  const { data: supplements, isLoading: supplementsLoading } = useQuery<SupplementWithSchedule[]>({
    queryKey: ["/api/supplements"],
  });

  const { data: todayLogs } = useQuery<SupplementLog[]>({
    queryKey: ["/api/supplements/logs/today"],
  });

  const { data: allLogs, isLoading: logsLoading } = useQuery<SupplementLog[]>({
    queryKey: ["/api/supplements/logs"],
  });

  const createSupplementMutation = useMutation({
    mutationFn: async (data: { name: string; defaultDose?: string; notes?: string }) => {
      return await apiRequest("POST", "/api/supplements", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplements"] });
      resetForm();
      toast({ title: "Supplement added" });
    },
    onError: () => {
      toast({ title: "Failed to add supplement", variant: "destructive" });
    },
  });

  const updateSupplementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; defaultDose?: string; notes?: string } }) => {
      return await apiRequest("PATCH", `/api/supplements/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplements"] });
      resetForm();
      toast({ title: "Supplement updated" });
    },
    onError: () => {
      toast({ title: "Failed to update supplement", variant: "destructive" });
    },
  });

  const deleteSupplementMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/supplements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplements"] });
      toast({ title: "Supplement deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete supplement", variant: "destructive" });
    },
  });

  const logIntakeMutation = useMutation({
    mutationFn: async (data: { supplementId: string; dose: string }) => {
      return await apiRequest("POST", "/api/supplements/logs", {
        ...data,
        takenAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplements/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplements/logs/today"] });
      toast({ title: "Intake logged" });
    },
    onError: () => {
      toast({ title: "Failed to log intake", variant: "destructive" });
    },
  });

  const updateLogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { dose: string; takenAt: string } }) => {
      return await apiRequest("PATCH", `/api/supplements/logs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplements/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplements/logs/today"] });
      resetLogForm();
      toast({ title: "Log updated" });
    },
    onError: () => {
      toast({ title: "Failed to update log", variant: "destructive" });
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/supplements/logs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplements/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplements/logs/today"] });
      toast({ title: "Log deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete log", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setNewSupplementOpen(false);
    setEditingSupplement(null);
    setFormName("");
    setFormDose("");
    setFormNotes("");
  };

  const resetLogForm = () => {
    setEditingLog(null);
    setLogFormDose("");
    setLogFormDate("");
    setLogFormTime("");
  };

  const openEditLogDialog = (log: SupplementLog) => {
    setEditingLog(log);
    const takenAt = new Date(log.takenAt);
    setLogFormDose(log.dose);
    setLogFormDate(format(takenAt, "yyyy-MM-dd"));
    setLogFormTime(format(takenAt, "HH:mm"));
  };

  const handleSaveLog = () => {
    if (!editingLog) return;
    const takenAt = new Date(`${logFormDate}T${logFormTime}`);
    updateLogMutation.mutate({
      id: editingLog.id,
      data: { dose: logFormDose, takenAt: takenAt.toISOString() },
    });
  };

  const openEditDialog = (supplement: Supplement) => {
    setEditingSupplement(supplement);
    setFormName(supplement.name);
    setFormDose(supplement.defaultDose || "");
    setFormNotes(supplement.notes || "");
  };

  const handleSave = () => {
    if (editingSupplement) {
      updateSupplementMutation.mutate({
        id: editingSupplement.id,
        data: { name: formName, defaultDose: formDose || undefined, notes: formNotes || undefined },
      });
    } else {
      createSupplementMutation.mutate({
        name: formName,
        defaultDose: formDose || undefined,
        notes: formNotes || undefined,
      });
    }
  };

  const isLoggedToday = (supplementId: string) => {
    return todayLogs?.some(log => log.supplementId === supplementId);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Supplements</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your supplement intake</p>
        </div>

        <Tabs defaultValue="today" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="today" data-testid="tab-today">Today</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4">
            <Dialog open={newSupplementOpen || !!editingSupplement} onOpenChange={(open) => !open && resetForm()}>
              <DialogTrigger asChild>
                <Button className="w-full" onClick={() => setNewSupplementOpen(true)} data-testid="button-add-supplement">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSupplement ? "Edit Supplement" : "Add Supplement"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="supp-name">Name</Label>
                    <Input
                      id="supp-name"
                      placeholder="e.g., Creatine, Vitamin D"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      data-testid="input-supplement-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supp-dose">Default Dose</Label>
                    <Input
                      id="supp-dose"
                      placeholder="e.g., 5g, 2000 IU"
                      value={formDose}
                      onChange={(e) => setFormDose(e.target.value)}
                      data-testid="input-supplement-dose"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supp-notes">Notes (optional)</Label>
                    <Textarea
                      id="supp-notes"
                      placeholder="Any notes..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      data-testid="input-supplement-notes"
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleSave}
                    disabled={!formName.trim() || createSupplementMutation.isPending || updateSupplementMutation.isPending}
                    data-testid="button-save-supplement"
                  >
                    {editingSupplement ? "Save Changes" : "Add Supplement"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {supplementsLoading ? (
              <ListSkeleton count={3} />
            ) : supplements && supplements.length > 0 ? (
              <div className="space-y-3">
                {supplements.map((supplement) => {
                  const logged = isLoggedToday(supplement.id);
                  return (
                    <Card 
                      key={supplement.id} 
                      className={`p-4 transition-colors ${logged ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" : ""}`}
                      data-testid={`card-supplement-${supplement.id}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            logged 
                              ? "bg-green-100 dark:bg-green-900/30" 
                              : "bg-muted"
                          }`}>
                            {logged ? (
                              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <Pill className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{supplement.name}</p>
                            {supplement.defaultDose && (
                              <p className="text-sm text-muted-foreground">{supplement.defaultDose}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!logged && (
                            <Button
                              size="sm"
                              onClick={() => logIntakeMutation.mutate({
                                supplementId: supplement.id,
                                dose: supplement.defaultDose || "1 serving",
                              })}
                              disabled={logIntakeMutation.isPending}
                              data-testid={`button-log-${supplement.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Log
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-menu-${supplement.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(supplement)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteSupplementMutation.mutate(supplement.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Pill}
                title="No supplements"
                description="Add supplements to track your daily intake"
                action={{
                  label: "Add Supplement",
                  onClick: () => setNewSupplementOpen(true),
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Dialog open={!!editingLog} onOpenChange={(open) => !open && resetLogForm()}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Log</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="log-dose">Dose</Label>
                    <Input
                      id="log-dose"
                      value={logFormDose}
                      onChange={(e) => setLogFormDose(e.target.value)}
                      data-testid="input-log-dose"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="log-date">Date</Label>
                      <Input
                        id="log-date"
                        type="date"
                        value={logFormDate}
                        onChange={(e) => setLogFormDate(e.target.value)}
                        data-testid="input-log-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="log-time">Time</Label>
                      <Input
                        id="log-time"
                        type="time"
                        value={logFormTime}
                        onChange={(e) => setLogFormTime(e.target.value)}
                        data-testid="input-log-time"
                      />
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleSaveLog}
                    disabled={!logFormDose.trim() || !logFormDate || !logFormTime || updateLogMutation.isPending}
                    data-testid="button-save-log"
                  >
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {logsLoading ? (
              <ListSkeleton count={5} />
            ) : allLogs && allLogs.length > 0 ? (
              <div className="space-y-3">
                {allLogs.map((log) => {
                  const supplement = supplements?.find(s => s.id === log.supplementId);
                  return (
                    <Card key={log.id} className="p-3" data-testid={`card-log-${log.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                          <Pill className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {supplement?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">{log.dose}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground mr-2">
                          <p>{format(new Date(log.takenAt), "MMM d")}</p>
                          <p>{format(new Date(log.takenAt), "h:mm a")}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-log-menu-${log.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditLogDialog(log)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteLogMutation.mutate(log.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Clock}
                title="No intake history"
                description="Log your supplement intake to see history"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
