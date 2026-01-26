import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dumbbell, Target, TrendingUp, Pill, Scale, Calendar } from "lucide-react";

const features = [
  {
    icon: Dumbbell,
    title: "Exercise Bank",
    description: "Build your personal library of exercises with custom tracking preferences"
  },
  {
    icon: Target,
    title: "Workout Templates",
    description: "Create structured workout plans with target sets, reps, and weights"
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Schedule workouts for the week and track your consistency"
  },
  {
    icon: TrendingUp,
    title: "Track Progress",
    description: "See what you lifted last time and watch your progress over time"
  },
  {
    icon: Pill,
    title: "Supplement Tracking",
    description: "Log your supplement intake and maintain consistency"
  },
  {
    icon: Scale,
    title: "Body Weight",
    description: "Track your body weight to monitor recomposition goals"
  }
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-14 px-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">O</span>
            </div>
            <span className="font-semibold text-lg tracking-tight">Outwork</span>
          </div>
          <Button asChild data-testid="button-login-header">
            <a href="/api/login">Log in</a>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-16 px-4 sm:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
              <Dumbbell className="h-4 w-4" />
              Track your gains
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight mb-6">
              Your workout journal,{" "}
              <span className="text-primary">simplified</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Plan workouts, log every set, track supplements, and see your progress over time. 
              Built for lifters who want to get stronger without the complexity.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Button size="lg" asChild className="w-full sm:w-auto" data-testid="button-get-started">
                <a href="/api/login">Get started free</a>
              </Button>
              <p className="text-sm text-muted-foreground">
                No credit card required
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-4">
                Everything you need to track your training
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Simple, focused features that help you stay consistent and make progress
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className="p-6 hover-elevate transition-transform"
                  data-testid={`card-feature-${index}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-4">
              Ready to track your workouts?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join now and start logging your training in seconds
            </p>
            <Button size="lg" asChild data-testid="button-get-started-bottom">
              <a href="/api/login">Start tracking</a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">O</span>
            </div>
            <span>Outwork</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Outwork. Built for lifters.</p>
        </div>
      </footer>
    </div>
  );
}
