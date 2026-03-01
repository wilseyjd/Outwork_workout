import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Plus,
  X,
  Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlannedSet {
  reps?: number;
  weight?: number;
  rest?: number;
  warmup?: boolean;
}

interface PlanResponse {
  goalSummary: string;
  planRationale: string;
  critiques: string[];
  assumptions: string[];
  overallStructure: {
    totalWeeks: number;
    workoutsPerWeek: number;
    estimatedSessionMinutes: number;
    phases: Array<{ name: string; weeks: string; focus: string }>;
  };
  weeklyStructure: Array<{ dayOfWeek: string; workoutType: string; focus: string }>;
  workoutTemplates: Array<{
    name: string;
    exercises: Array<{ exerciseName: string; sets: PlannedSet[] }>;
  }>;
  scheduleMap: Array<{ weekNumber: number; dayOfWeek: string; templateName: string }>;
}

interface FormData {
  primaryGoal: string;
  goalCategory: string;
  secondaryGoals: string[];
  targetDate: string;
  timelineDescription: string;
  daysPerWeek: number;
  sessionDurationMinutes: number;
  equipmentType: string;
  avoidances: string;
  additionalContext: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_FORM: FormData = {
  primaryGoal: "",
  goalCategory: "",
  secondaryGoals: [],
  targetDate: "",
  timelineDescription: "",
  daysPerWeek: 4,
  sessionDurationMinutes: 60,
  equipmentType: "full_gym",
  avoidances: "",
  additionalContext: "",
};

const GOAL_CATEGORIES = [
  { value: "strength", label: "Strength" },
  { value: "hypertrophy", label: "Hypertrophy / Muscle Gain" },
  { value: "fat_loss", label: "Fat Loss" },
  { value: "endurance", label: "Endurance" },
  { value: "sport_performance", label: "Sport Performance" },
  { value: "general_fitness", label: "General Fitness" },
  { value: "other", label: "Other" },
];

const TIMELINE_OPTIONS = [
  { value: "4 weeks", label: "4 weeks" },
  { value: "6 weeks", label: "6 weeks" },
  { value: "3 months", label: "3 months" },
  { value: "6 months", label: "6 months" },
  { value: "9 months", label: "9 months" },
  { value: "1 year", label: "1 year" },
  { value: "18+ months", label: "18+ months" },
];

const EQUIPMENT_OPTIONS = [
  { value: "full_gym", label: "Full gym (barbells, machines, etc.)" },
  { value: "home", label: "Home gym (dumbbells, some equipment)" },
  { value: "bodyweight", label: "Bodyweight only" },
];

const SESSION_DURATION_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
  { value: 75, label: "75 min" },
  { value: 90, label: "90+ min" },
];

const LOADING_MESSAGES = [
  "Analyzing your goals...",
  "Building your program...",
  "Reviewing feasibility...",
  "Structuring your schedule...",
  "Finalizing your plan...",
];

const TOTAL_STEPS = 4;

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageMode = "wizard" | "loading" | "review";

export default function TrainingPlan() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [mode, setMode] = useState<PageMode>("wizard");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [secondaryGoalInput, setSecondaryGoalInput] = useState("");
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  useEffect(() => {
    if (mode !== "loading") return;
    const interval = setInterval(() => {
      setLoadingMsgIdx(i => (i + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [mode]);

  const generateMutation = useMutation({
    mutationFn: () =>
      apiRequest<PlanResponse>("POST", "/api/training-plan/generate", {
        primaryGoal: form.primaryGoal,
        goalCategory: form.goalCategory || undefined,
        secondaryGoals: form.secondaryGoals.length > 0 ? form.secondaryGoals : undefined,
        targetDate: form.targetDate || undefined,
        timelineDescription: form.timelineDescription || undefined,
        daysPerWeek: form.daysPerWeek,
        sessionDurationMinutes: form.sessionDurationMinutes,
        equipmentType: form.equipmentType,
        avoidances: form.avoidances || undefined,
        additionalContext: form.additionalContext || undefined,
      }),
    onMutate: () => {
      setMode("loading");
      setLoadingMsgIdx(0);
    },
    onSuccess: data => {
      setPlan(data);
      setMode("review");
    },
    onError: (error: Error) => {
      setMode("wizard");
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function addSecondaryGoal() {
    const trimmed = secondaryGoalInput.trim();
    if (!trimmed || form.secondaryGoals.length >= 3) return;
    setForm(f => ({ ...f, secondaryGoals: [...f.secondaryGoals, trimmed] }));
    setSecondaryGoalInput("");
  }

  function removeSecondaryGoal(idx: number) {
    setForm(f => ({ ...f, secondaryGoals: f.secondaryGoals.filter((_, i) => i !== idx) }));
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1: return form.primaryGoal.trim().length > 0;
      case 2: return true;
      case 3: return !!(form.targetDate || form.timelineDescription);
      case 4: return form.daysPerWeek >= 1 && form.sessionDurationMinutes >= 30 && !!form.equipmentType;
      default: return false;
    }
  }

  // ─── Loading screen ────────────────────────────────────────────────────────
  if (mode === "loading") {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Creating your plan</h2>
            <p className="text-muted-foreground text-sm">{LOADING_MESSAGES[loadingMsgIdx]}</p>
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  // ─── Review screen ─────────────────────────────────────────────────────────
  if (mode === "review" && plan) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 mb-1"
              onClick={() => {
                setMode("wizard");
                setPlan(null);
              }}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Revise inputs
            </Button>
            <h1 className="text-lg font-semibold">Your Training Plan</h1>
          </div>

          {/* Goal summary + rationale */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base leading-snug">{plan.goalSummary}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{plan.planRationale}</p>
            </CardContent>
          </Card>

          {/* Critiques */}
          {plan.critiques.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  {plan.critiques.map((c, i) => (
                    <li key={i} className="text-sm">{c}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Assumptions */}
          {plan.assumptions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Assumptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {plan.assumptions.map((a, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      {a}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Plan outline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Plan Outline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-2xl font-bold">{plan.overallStructure.totalWeeks}</div>
                  <div className="text-xs text-muted-foreground mt-1">weeks</div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-2xl font-bold">{plan.overallStructure.workoutsPerWeek}</div>
                  <div className="text-xs text-muted-foreground mt-1">days/week</div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-2xl font-bold">{plan.overallStructure.estimatedSessionMinutes}</div>
                  <div className="text-xs text-muted-foreground mt-1">min/session</div>
                </div>
              </div>

              {plan.overallStructure.phases.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Phases</p>
                  {plan.overallStructure.phases.map((phase, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className="shrink-0 text-xs">
                        Wk {phase.weeks}
                      </Badge>
                      <div>
                        <span className="font-medium">{phase.name}</span>
                        {phase.focus && (
                          <span className="text-muted-foreground"> — {phase.focus}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {plan.weeklyStructure.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Weekly Schedule</p>
                  {plan.weeklyStructure.map((day, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="text-muted-foreground w-20 shrink-0">{day.dayOfWeek}</span>
                      <span>{day.workoutType}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workout templates preview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Workout Templates ({plan.workoutTemplates.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {plan.workoutTemplates.map((t, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-muted-foreground">{t.exercises.length} exercises</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2 pb-4">
            <Button
              className="w-full"
              disabled
              title="Plan acceptance coming soon"
            >
              Accept &amp; Build Plan
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setMode("wizard");
                setPlan(null);
              }}
            >
              Revise Inputs &amp; Regenerate
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ─── Wizard ────────────────────────────────────────────────────────────────
  const progressPct = ((step - 1) / TOTAL_STEPS) * 100;

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (step > 1) {
                setStep(s => s - 1);
              } else {
                navigate("/plan");
              }
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Create Training Plan</h1>
            <p className="text-xs text-muted-foreground">Step {step} of {TOTAL_STEPS}</p>
          </div>
        </div>

        <Progress value={progressPct} className="h-1.5" />

        {/* Step 1: Primary Goal */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold mb-1">What is your primary fitness goal?</h2>
              <p className="text-sm text-muted-foreground">
                Be as specific as you like — more context helps create a better plan.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryGoal">Describe your goal</Label>
              <Textarea
                id="primaryGoal"
                placeholder={`e.g. "I want to run my first 5K in under 30 minutes" or "Build a stronger squat — currently at 185 lbs for 5 reps"`}
                value={form.primaryGoal}
                onChange={e => setForm(f => ({ ...f, primaryGoal: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Goal category (optional)</Label>
              <Select
                value={form.goalCategory}
                onValueChange={val => setForm(f => ({ ...f, goalCategory: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2: Secondary Goals */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold mb-1">Any secondary goals?</h2>
              <p className="text-sm text-muted-foreground">
                Optional. Add up to 3 other things you'd like the plan to consider.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={`e.g. "Maintain cardio fitness"`}
                value={secondaryGoalInput}
                onChange={e => setSecondaryGoalInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSecondaryGoal();
                  }
                }}
                disabled={form.secondaryGoals.length >= 3}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={addSecondaryGoal}
                disabled={!secondaryGoalInput.trim() || form.secondaryGoals.length >= 3}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {form.secondaryGoals.map((goal, idx) => (
                <div key={idx} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                  <span className="text-sm">{goal}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeSecondaryGoal(idx)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              {form.secondaryGoals.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No secondary goals added — that's fine!</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Timeline */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold mb-1">What's your timeline?</h2>
              <p className="text-sm text-muted-foreground">
                Set a specific target date or pick a rough timeframe.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetDate">Target date</Label>
              <Input
                id="targetDate"
                type="date"
                value={form.targetDate}
                onChange={e =>
                  setForm(f => ({ ...f, targetDate: e.target.value, timelineDescription: "" }))
                }
              />
            </div>
            <div className="relative flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              <span>or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-2">
              <Label>Roughly when?</Label>
              <Select
                value={form.timelineDescription}
                onValueChange={val =>
                  setForm(f => ({ ...f, timelineDescription: val, targetDate: "" }))
                }
                disabled={!!form.targetDate}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a timeframe" />
                </SelectTrigger>
                <SelectContent>
                  {TIMELINE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.targetDate && (
                <p className="text-xs text-muted-foreground">
                  Clear the date above to use the dropdown instead.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Constraints */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold mb-1">Training constraints</h2>
              <p className="text-sm text-muted-foreground">
                Help us plan within your schedule and available equipment.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Days per week</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map(d => (
                  <button
                    key={d}
                    className={`w-10 h-10 rounded-lg text-sm font-medium border transition-colors ${
                      form.daysPerWeek === d
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                    onClick={() => setForm(f => ({ ...f, daysPerWeek: d }))}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Session length</Label>
              <div className="flex gap-2 flex-wrap">
                {SESSION_DURATION_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.sessionDurationMinutes === o.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                    onClick={() => setForm(f => ({ ...f, sessionDurationMinutes: o.value }))}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Equipment available</Label>
              <Select
                value={form.equipmentType}
                onValueChange={val => setForm(f => ({ ...f, equipmentType: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avoidances">Exercises or movements to avoid (optional)</Label>
              <Input
                id="avoidances"
                placeholder={`e.g. "No overhead pressing — shoulder injury"`}
                value={form.avoidances}
                onChange={e => setForm(f => ({ ...f, avoidances: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalContext">Additional context (optional)</Label>
              <Textarea
                id="additionalContext"
                placeholder={`e.g. "I play recreational soccer on Saturdays" or "I currently squat 185 lbs for 5x5"`}
                value={form.additionalContext}
                onChange={e => setForm(f => ({ ...f, additionalContext: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2 pt-1 pb-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step < TOTAL_STEPS ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!canAdvance() || generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate Plan
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
