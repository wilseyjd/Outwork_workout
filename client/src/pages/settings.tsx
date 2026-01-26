import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ListSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Scale, Plus, TrendingDown, TrendingUp, Minus, Moon, Sun, LogOut, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BodyWeightLog } from "@shared/schema";

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [weightNotes, setWeightNotes] = useState("");

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.email?.[0]?.toUpperCase() || "U";

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email || "User";

  const { data: weightLogs, isLoading: weightsLoading } = useQuery<BodyWeightLog[]>({
    queryKey: ["/api/weight"],
  });

  const logWeightMutation = useMutation({
    mutationFn: async (data: { weightLbs: string; notes?: string }) => {
      return await apiRequest("POST", "/api/weight", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weight"] });
      setWeightDialogOpen(false);
      setNewWeight("");
      setWeightNotes("");
      toast({ title: "Weight logged" });
    },
    onError: () => {
      toast({ title: "Failed to log weight", variant: "destructive" });
    },
  });

  const latestWeight = weightLogs?.[0];
  const previousWeight = weightLogs?.[1];
  const weightChange = latestWeight && previousWeight 
    ? Number(latestWeight.weightLbs) - Number(previousWeight.weightLbs)
    : null;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Profile and preferences</p>
        </div>

        <Card className="p-4" data-testid="card-profile">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.profileImageUrl || undefined} alt={displayName} />
              <AvatarFallback className="text-lg bg-accent text-accent-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg truncate">{displayName}</p>
              {user?.email && (
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Body Weight</h2>
            <Dialog open={weightDialogOpen} onOpenChange={setWeightDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-log-weight">
                  <Plus className="h-4 w-4 mr-1" />
                  Log Weight
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Body Weight</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (lbs)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="e.g., 175.5"
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                      data-testid="input-weight"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight-notes">Notes (optional)</Label>
                    <Input
                      id="weight-notes"
                      placeholder="Any notes..."
                      value={weightNotes}
                      onChange={(e) => setWeightNotes(e.target.value)}
                      data-testid="input-weight-notes"
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => logWeightMutation.mutate({
                      weightLbs: newWeight,
                      notes: weightNotes || undefined,
                    })}
                    disabled={!newWeight || logWeightMutation.isPending}
                    data-testid="button-save-weight"
                  >
                    Save Weight
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {latestWeight && (
            <Card className="p-4" data-testid="card-current-weight">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Scale className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold">{Number(latestWeight.weightLbs).toFixed(1)} lbs</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(latestWeight.loggedAt!), "MMM d, yyyy")}
                  </p>
                </div>
                {weightChange !== null && (
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    weightChange > 0 
                      ? "text-red-500" 
                      : weightChange < 0 
                        ? "text-green-500" 
                        : "text-muted-foreground"
                  }`}>
                    {weightChange > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : weightChange < 0 ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                    {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} lbs
                  </div>
                )}
              </div>
            </Card>
          )}

          {weightsLoading ? (
            <ListSkeleton count={3} />
          ) : weightLogs && weightLogs.length > 1 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">History</p>
              {weightLogs.slice(1, 10).map((log) => (
                <Card key={log.id} className="p-3" data-testid={`card-weight-${log.id}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{Number(log.weightLbs).toFixed(1)} lbs</p>
                      {log.notes && (
                        <p className="text-xs text-muted-foreground">{log.notes}</p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(log.loggedAt!), "MMM d")}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          ) : !latestWeight ? (
            <EmptyState
              icon={Scale}
              title="No weight logged"
              description="Start tracking your weight to see progress"
              action={{
                label: "Log Weight",
                onClick: () => setWeightDialogOpen(true),
              }}
            />
          ) : null}
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Preferences</h2>
          
          <Card 
            className="p-4 hover-elevate cursor-pointer"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            data-testid="card-theme-toggle"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Sun className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Appearance</p>
                  <p className="text-sm text-muted-foreground">
                    {theme === "dark" ? "Dark mode" : "Light mode"}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        </div>

        <Button 
          variant="outline" 
          className="w-full text-destructive hover:text-destructive"
          onClick={() => logout()}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Log out
        </Button>
      </div>
    </AppLayout>
  );
}
