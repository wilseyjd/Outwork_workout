import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { History as HistoryIcon, Dumbbell, Clock, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import type { WorkoutSession, WorkoutTemplate } from "@shared/schema";

interface SessionWithTemplate extends WorkoutSession {
  template?: WorkoutTemplate;
  exerciseCount?: number;
  setCount?: number;
}

export default function History() {
  const { data: sessions, isLoading } = useQuery<SessionWithTemplate[]>({
    queryKey: ["/api/sessions"],
  });

  const formatDuration = (session: SessionWithTemplate) => {
    if (!session.endedAt) return "In progress";
    const start = new Date(session.startedAt);
    const end = new Date(session.endedAt);
    const mins = Math.round((end.getTime() - start.getTime()) / 60000);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">History</h1>
          <p className="text-muted-foreground text-sm mt-1">Past workout sessions</p>
        </div>

        {isLoading ? (
          <ListSkeleton count={5} />
        ) : sessions && sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link key={session.id} href={`/session/${session.id}/view`}>
                <Card 
                  className="p-4 hover-elevate cursor-pointer"
                  data-testid={`card-session-${session.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {session.template?.name || "Ad-hoc Workout"}
                        </p>
                        {!session.endedAt && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                        <span>{format(new Date(session.startedAt), "MMM d, h:mm a")}</span>
                        {session.endedAt && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(session)}
                            </span>
                          </>
                        )}
                      </div>
                      {(session.exerciseCount || session.setCount) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {session.exerciseCount} exercises · {session.setCount} sets
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={HistoryIcon}
            title="No workouts yet"
            description="Complete a workout to see it in your history"
          />
        )}
      </div>
    </AppLayout>
  );
}
