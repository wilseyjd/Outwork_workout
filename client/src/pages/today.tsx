import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Calendar, Play, CheckCircle2, XCircle, Clock, Dumbbell, Plus, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkoutScheduleItem, WorkoutTemplate, WorkoutSession } from "@shared/schema";

interface ScheduleWithTemplate extends WorkoutScheduleItem {
  template?: WorkoutTemplate;
}

interface ActiveSession extends WorkoutSession {
  template?: WorkoutTemplate;
}

interface TemplateWithCount extends WorkoutTemplate {
  exerciseCount: number;
}

export default function Today() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");
  const [startWorkoutOpen, setStartWorkoutOpen] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");

  const { data: todaySchedule, isLoading: scheduleLoading } = useQuery<ScheduleWithTemplate[]>({
    queryKey: ["/api/schedule", today],
  });

  const { data: activeSession } = useQuery<ActiveSession | null>({
    queryKey: ["/api/sessions/active"],
  });

  const startWorkoutMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const res = await apiRequest("POST", `/api/sessions/start/${scheduleId}`);
      return res as WorkoutSession;
    },
    onSuccess: (data: WorkoutSession) => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      navigate(`/session/${data.id}`);
    },
    onError: () => {
      toast({ title: "Failed to start workout", variant: "destructive" });
    },
  });

  const { data: templates } = useQuery<TemplateWithCount[]>({
    queryKey: ["/api/templates"],
    enabled: startWorkoutOpen,
  });

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!templateSearchQuery.trim()) return templates;
    const q = templateSearchQuery.toLowerCase();
    return templates.filter((t) => t.name.toLowerCase().includes(q));
  }, [templates, templateSearchQuery]);

  const startFromTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await apiRequest("POST", `/api/sessions/start-from-template/${templateId}`);
      return res as WorkoutSession;
    },
    onSuccess: (data: WorkoutSession) => {
      setStartWorkoutOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      navigate(`/session/${data.id}`);
    },
    onError: () => {
      toast({ title: "Failed to start workout", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3 w-3 mr-1" />Done</Badge>;
      case "skipped":
        return <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="h-3 w-3 mr-1" />Skipped</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Planned</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Today</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        </div>

        {activeSession && (
          <Card className="p-4 border-primary bg-primary/5" data-testid="card-active-session">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Play className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Workout in progress</p>
                  <p className="text-sm text-muted-foreground">
                    {activeSession.template?.name || "Ad-hoc workout"}
                  </p>
                </div>
              </div>
              <Button asChild data-testid="button-continue-workout">
                <Link href={`/session/${activeSession.id}`}>Continue</Link>
              </Button>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Scheduled Workouts</h2>
            <Button variant="ghost" size="sm" asChild data-testid="button-view-calendar">
              <Link href="/plan">
                <Calendar className="h-4 w-4 mr-1" />
                View all
              </Link>
            </Button>
          </div>

          {scheduleLoading ? (
            <ListSkeleton count={2} />
          ) : todaySchedule && todaySchedule.length > 0 ? (
            <div className="space-y-3">
              {todaySchedule.map((schedule) => (
                <Card 
                  key={schedule.id} 
                  className="p-4 hover-elevate"
                  data-testid={`card-schedule-${schedule.id}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {schedule.template?.name || "Workout"}
                        </p>
                        {getStatusBadge(schedule.status || "planned")}
                      </div>
                    </div>
                    {schedule.status === "planned" && !activeSession && (
                      <Button 
                        size="sm"
                        onClick={() => startWorkoutMutation.mutate(schedule.id)}
                        disabled={startWorkoutMutation.isPending}
                        data-testid={`button-start-${schedule.id}`}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No workouts scheduled"
              description="Schedule a workout from your templates to see it here"
              action={{
                label: "Go to Plan",
                onClick: () => navigate("/plan"),
              }}
            />
          )}
        </div>

        {!activeSession && (
          <div className="pt-4">
            <Dialog open={startWorkoutOpen} onOpenChange={(open) => {
              setStartWorkoutOpen(open);
              if (!open) setTemplateSearchQuery("");
            }}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full"
                  data-testid="button-start-adhoc"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Start workout
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start Workout</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  {templates && templates.length > 0 && (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search templates..."
                          value={templateSearchQuery}
                          onChange={(e) => setTemplateSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <div className="max-h-72 overflow-y-auto rounded-md border border-input">
                        {filteredTemplates.length > 0 ? (
                          filteredTemplates.map((template) => (
                            <button
                              key={template.id}
                              onClick={() => startFromTemplateMutation.mutate(template.id)}
                              disabled={startFromTemplateMutation.isPending}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border last:border-b-0"
                            >
                              <div className="font-medium">{template.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {template.exerciseCount} {template.exerciseCount === 1 ? "exercise" : "exercises"}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-sm text-muted-foreground">No templates found</div>
                        )}
                      </div>
                    </>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setStartWorkoutOpen(false);
                      navigate("/session/new");
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Start blank workout
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
