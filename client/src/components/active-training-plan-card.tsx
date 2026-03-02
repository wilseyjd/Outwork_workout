import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Target, ChevronRight, X, Calendar, Dumbbell, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ActiveTrainingGoal {
  id: string;
  primaryGoal: string;
  goalCategory: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  targetDate: string | null;
  timelineDescription: string | null;
  daysPerWeek: number | null;
  sessionDurationMinutes: number | null;
  generatedPlan: {
    goalSummary: string;
    planRationale: string;
    overallStructure: {
      totalWeeks: number;
      workoutsPerWeek: number;
      estimatedSessionMinutes: number;
      phases: Array<{ name: string; weeks: string; focus: string }>;
    };
    weeklyStructure: Array<{ dayOfWeek: string; workoutType: string; focus: string }>;
    workoutTemplates: Array<{ name: string }>;
  } | null;
  currentWeek: number;
  totalWeeks: number;
}

interface ActiveTrainingPlanCardProps {
  /** "today" shows an inline card with a sheet opener; "plan" shows a compact card */
  mode?: "today" | "plan";
  /** Show a "Create Training Plan" CTA when no plan is active */
  showCta?: boolean;
}

export function ActiveTrainingPlanCard({ mode = "today", showCta = false }: ActiveTrainingPlanCardProps) {
  const { toast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const { data: activeGoal, isLoading } = useQuery<ActiveTrainingGoal | null>({
    queryKey: ["/api/training-plan/active"],
  });

  const cancelMutation = useMutation({
    mutationFn: async (removeFutureWorkouts: boolean) => {
      await apiRequest("DELETE", `/api/training-plan/active?removeFutureWorkouts=${removeFutureWorkouts}`);
    },
    onSuccess: (_, removeFutureWorkouts) => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-plan/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      setSheetOpen(false);
      setCancelDialogOpen(false);
      toast({
        title: "Training plan cancelled",
        description: removeFutureWorkouts
          ? "Future scheduled workouts have been removed."
          : "Your schedule has been kept.",
      });
    },
    onError: () => {
      toast({ title: "Failed to cancel training plan", variant: "destructive" });
    },
  });

  if (isLoading) return null;

  if (!activeGoal) {
    if (!showCta) return null;
    return (
      <Card className="p-4 border-dashed" data-testid="card-create-training-plan">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">No active training plan</p>
            <p className="text-xs text-muted-foreground">Let AI build a personalised program for your goal</p>
          </div>
          <Button size="sm" asChild>
            <Link href="/training-plan">
              Create Plan
            </Link>
          </Button>
        </div>
      </Card>
    );
  }

  const plan = activeGoal.generatedPlan;

  return (
    <>
      <Card
        className="p-4 border-primary/40 bg-primary/5 cursor-pointer hover-elevate"
        onClick={() => setSheetOpen(true)}
        data-testid="card-active-training-plan"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm truncate">{activeGoal.primaryGoal}</p>
              {activeGoal.goalCategory && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {activeGoal.goalCategory.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Week {activeGoal.currentWeek} of {activeGoal.totalWeeks}
              {activeGoal.daysPerWeek ? ` · ${activeGoal.daysPerWeek}×/week` : ""}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Active Training Plan
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5">
            {/* Goal summary */}
            <div>
              <p className="font-semibold text-base">{activeGoal.primaryGoal}</p>
              {plan?.goalSummary && (
                <p className="text-sm text-muted-foreground mt-1">{plan.goalSummary}</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-card p-3 text-center">
                <p className="text-lg font-bold">{activeGoal.currentWeek}</p>
                <p className="text-xs text-muted-foreground">of {activeGoal.totalWeeks} wks</p>
              </div>
              {activeGoal.daysPerWeek && (
                <div className="rounded-lg border bg-card p-3 text-center">
                  <p className="text-lg font-bold">{activeGoal.daysPerWeek}×</p>
                  <p className="text-xs text-muted-foreground">per week</p>
                </div>
              )}
              {activeGoal.sessionDurationMinutes && (
                <div className="rounded-lg border bg-card p-3 text-center">
                  <p className="text-lg font-bold">{activeGoal.sessionDurationMinutes}</p>
                  <p className="text-xs text-muted-foreground">min/session</p>
                </div>
              )}
            </div>

            {/* Timeline */}
            {(activeGoal.startDate || activeGoal.endDate || activeGoal.targetDate) && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</p>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {activeGoal.startDate && <span>Started {activeGoal.startDate}</span>}
                  {activeGoal.endDate && <span>· Ends {activeGoal.endDate}</span>}
                </div>
                {activeGoal.timelineDescription && (
                  <p className="text-sm text-muted-foreground">{activeGoal.timelineDescription}</p>
                )}
              </div>
            )}

            {/* Phases */}
            {plan?.overallStructure.phases && plan.overallStructure.phases.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phases</p>
                <div className="space-y-2">
                  {plan.overallStructure.phases.map((phase, i) => (
                    <div key={i} className="rounded-lg border bg-card p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{phase.name}</p>
                        <Badge variant="outline" className="text-xs">Wk {phase.weeks}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{phase.focus}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly structure */}
            {plan?.weeklyStructure && plan.weeklyStructure.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weekly Schedule</p>
                <div className="space-y-1">
                  {plan.weeklyStructure.map((day, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm py-1">
                      <span className="w-24 font-medium shrink-0">{day.dayOfWeek}</span>
                      <span className="text-muted-foreground truncate">{day.workoutType}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Workouts */}
            {plan?.workoutTemplates && plan.workoutTemplates.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workout Templates</p>
                <div className="space-y-1">
                  {plan.workoutTemplates.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm py-1">
                      <Dumbbell className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{t.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cancel button */}
            <div className="pt-2 pb-4">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setCancelDialogOpen(true)}
                data-testid="button-cancel-training-plan"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel Training Plan
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Training Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark your active training plan as cancelled. Would you also like to remove future
              scheduled workouts that were created by this plan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => cancelMutation.mutate(true)}
              disabled={cancelMutation.isPending}
              data-testid="button-cancel-with-workouts"
            >
              Cancel plan &amp; remove future workouts
            </AlertDialogAction>
            <AlertDialogAction
              className="bg-transparent border border-input text-foreground hover:bg-accent hover:text-accent-foreground shadow-sm"
              onClick={() => cancelMutation.mutate(false)}
              disabled={cancelMutation.isPending}
              data-testid="button-cancel-keep-workouts"
            >
              Cancel plan, keep my schedule
            </AlertDialogAction>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              Never mind
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
