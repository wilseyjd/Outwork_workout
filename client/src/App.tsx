import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";

import Landing from "@/pages/landing";
import Auth from "@/pages/auth";
import Today from "@/pages/today";
import Plan from "@/pages/plan";
import History from "@/pages/history";
import Supplements from "@/pages/supplements";
import Settings from "@/pages/settings";
import Exercises from "@/pages/exercises";
import Circuits from "@/pages/circuits";
import CircuitDetail from "@/pages/circuit-detail";
import TemplateDetail from "@/pages/template-detail";
import ExerciseDetail from "@/pages/exercise-detail";
import Session from "@/pages/session";
import SessionView from "@/pages/session-view";
import Analytics from "@/pages/analytics";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import NotFound from "@/pages/not-found";
import { TermsDialog } from "@/components/terms-dialog";

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="w-20 h-5" />
          </div>
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={Today} />
      <Route path="/plan" component={Plan} />
      <Route path="/history" component={History} />
      <Route path="/supplements" component={Supplements} />
      <Route path="/settings" component={Settings} />
      <Route path="/exercises" component={Exercises} />
      <Route path="/exercise/:id" component={ExerciseDetail} />
      <Route path="/circuits" component={Circuits} />
      <Route path="/circuit/:id" component={CircuitDetail} />
      <Route path="/template/:id" component={TemplateDetail} />
      <Route path="/session/:id" component={Session} />
      <Route path="/session/:id/view" component={SessionView} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route component={NotFound} />
    </Switch>
  );
}

function UnauthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/" component={Landing} />
      <Route><Redirect to="/auth" /></Route>
    </Switch>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!user) {
    return <UnauthenticatedRoutes />;
  }

  if (!user.termsAcceptedAt) {
    return (
      <>
        <AuthenticatedRoutes />
        <TermsDialog />
      </>
    );
  }

  return <AuthenticatedRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="outwork-theme">
        <TooltipProvider>
          <AppRouter />
          <Toaster />
          <VercelAnalytics />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
