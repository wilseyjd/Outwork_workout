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
import { Plus, Dumbbell, Calendar, ChevronRight, Edit, Trash2, Copy, MoreVertical, ListPlus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkoutTemplate, WorkoutScheduleItem, Exercise } from "@shared/schema";

interface TemplateWithExercises extends WorkoutTemplate {
  exerciseCount?: number;
}

interface ScheduleWithTemplate extends WorkoutScheduleItem {
  template?: WorkoutTemplate;
}

export default function Plan() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateNotes, setNewTemplateNotes] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: templates, isLoading: templatesLoading } = useQuery<TemplateWithExercises[]>({
    queryKey: ["/api/templates"],
  });

  const { data: weekSchedule } = useQuery<ScheduleWithTemplate[]>({
    queryKey: ["/api/schedule/week", format(weekStart, "yyyy-MM-dd")],
  });

  const { data: exercises } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises"],
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: { name: string; notes?: string }) => {
      return await apiRequest("POST", "/api/templates", data);
    },
    onSuccess: (template: WorkoutTemplate) => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setNewTemplateOpen(false);
      setNewTemplateName("");
      setNewTemplateNotes("");
      navigate(`/template/${template.id}`);
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  const copyTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/templates/${id}/copy`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template copied" });
    },
    onError: () => {
      toast({ title: "Failed to copy template", variant: "destructive" });
    },
  });

  const scheduleWorkoutMutation = useMutation({
    mutationFn: async (data: { templateId: string; scheduledDate: string }) => {
      return await apiRequest("POST", "/api/schedule", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      setScheduleOpen(false);
      setSelectedTemplateId(null);
      setSelectedDate(null);
      toast({ title: "Workout scheduled" });
    },
    onError: () => {
      toast({ title: "Failed to schedule workout", variant: "destructive" });
    },
  });

  const getScheduleForDay = (date: Date) => {
    return weekSchedule?.filter(s => s.scheduledDate === format(date, "yyyy-MM-dd")) || [];
  };

  const handleSchedule = () => {
    if (selectedTemplateId && selectedDate) {
      scheduleWorkoutMutation.mutate({
        templateId: selectedTemplateId,
        scheduledDate: format(selectedDate, "yyyy-MM-dd"),
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Plan</h1>
            <p className="text-muted-foreground text-sm mt-1">Build and schedule workouts</p>
          </div>
          <Button variant="ghost" size="sm" asChild data-testid="button-exercises">
            <Link href="/exercises">
              <ListPlus className="h-4 w-4 mr-1" />
              Exercises
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
            <TabsTrigger value="schedule" data-testid="tab-schedule">Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <Dialog open={newTemplateOpen} onOpenChange={setNewTemplateOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" data-testid="button-new-template">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Workout Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Push Day, Upper Body"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      data-testid="input-template-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any notes..."
                      value={newTemplateNotes}
                      onChange={(e) => setNewTemplateNotes(e.target.value)}
                      data-testid="input-template-notes"
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => createTemplateMutation.mutate({ 
                      name: newTemplateName, 
                      notes: newTemplateNotes || undefined 
                    })}
                    disabled={!newTemplateName.trim() || createTemplateMutation.isPending}
                    data-testid="button-create-template"
                  >
                    Create Template
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {templatesLoading ? (
              <ListSkeleton count={3} />
            ) : templates && templates.length > 0 ? (
              <div className="space-y-3">
                {templates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="p-4 hover-elevate"
                    data-testid={`card-template-${template.id}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/template/${template.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Dumbbell className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{template.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {template.exerciseCount || 0} exercises
                          </p>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedTemplateId(template.id);
                            setScheduleOpen(true);
                          }}
                          data-testid={`button-schedule-${template.id}`}
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-menu-${template.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/template/${template.id}`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyTemplateMutation.mutate(template.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteTemplateMutation.mutate(template.id)}
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
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Dumbbell}
                title="No templates yet"
                description="Create your first workout template to get started"
                action={{
                  label: "Create Template",
                  onClick: () => setNewTemplateOpen(true),
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => {
                const isToday = isSameDay(day, new Date());
                const daySchedule = getScheduleForDay(day);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => {
                      setSelectedDate(day);
                      if (!selectedTemplateId && templates?.length) {
                        setScheduleOpen(true);
                      }
                    }}
                    className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                      isToday 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    }`}
                    data-testid={`button-day-${format(day, "yyyy-MM-dd")}`}
                  >
                    <span className="text-xs font-medium">{format(day, "EEE")}</span>
                    <span className={`text-lg font-semibold ${isToday ? "" : ""}`}>
                      {format(day, "d")}
                    </span>
                    {daySchedule.length > 0 && (
                      <div className={`w-1.5 h-1.5 rounded-full mt-1 ${
                        isToday ? "bg-primary-foreground" : "bg-primary"
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              {weekDays.map((day) => {
                const daySchedule = getScheduleForDay(day);
                if (daySchedule.length === 0) return null;

                return (
                  <div key={day.toISOString()} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {format(day, "EEEE, MMM d")}
                    </p>
                    {daySchedule.map((schedule) => (
                      <Card key={schedule.id} className="p-3" data-testid={`card-scheduled-${schedule.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                            <Dumbbell className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium text-sm">
                            {schedule.template?.name || "Workout"}
                          </span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {schedule.status}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Workout</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <div className="grid gap-2">
                  {templates?.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        selectedTemplateId === template.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted"
                      }`}
                      data-testid={`button-select-template-${template.id}`}
                    >
                      <p className="font-medium">{template.name}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map((day) => {
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`p-2 rounded-lg text-center transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <span className="text-xs">{format(day, "EEE")}</span>
                        <br />
                        <span className="font-semibold">{format(day, "d")}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={handleSchedule}
                disabled={!selectedTemplateId || !selectedDate || scheduleWorkoutMutation.isPending}
                data-testid="button-confirm-schedule"
              >
                Schedule Workout
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
