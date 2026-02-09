import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Dumbbell, Loader2 } from "lucide-react";

export default function Auth() {
  const [, navigate] = useLocation();
  const { login, signup, isLoggingIn, isSigningUp } = useAuth();
  const { toast } = useToast();

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: ""
  });

  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetStep, setResetStep] = useState<"email" | "token">("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to request password reset");
      }
      return res.json();
    },
    onSuccess: () => {
      setResetStep("token");
      toast({ title: "Reset link sent", description: "Check your email (or console for local dev)" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to reset password");
      }
      return res.json();
    },
    onSuccess: () => {
      setForgotPasswordOpen(false);
      setResetStep("email");
      setResetEmail("");
      setResetToken("");
      setResetPassword("");
      setResetConfirmPassword("");
      toast({ title: "Password reset successfully", description: "You can now log in with your new password" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(loginData);
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        variant: "destructive"
      });
      return;
    }

    if (signupData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive"
      });
      return;
    }

    try {
      await signup({
        email: signupData.email,
        password: signupData.password,
        firstName: signupData.firstName || undefined,
        lastName: signupData.lastName || undefined,
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/outwork-logo.png" alt="Outwork Logo" className="w-10 h-10 rounded-lg" />
          <span className="font-semibold text-2xl tracking-tight">Outwork</span>
        </div>

        <Card>
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="tab-login">Log in</TabsTrigger>
                <TabsTrigger value="signup" data-testid="tab-signup">Sign up</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                      data-testid="input-login-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                      data-testid="input-login-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoggingIn}
                    data-testid="button-login-submit"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Log in"
                    )}
                  </Button>

                  <div className="text-center mt-4">
                    <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          className="text-sm text-muted-foreground hover:text-primary"
                          type="button"
                          data-testid="button-forgot-password"
                        >
                          Forgot Password?
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {resetStep === "email" ? "Reset Password" : "Enter Reset Token"}
                          </DialogTitle>
                          <DialogDescription>
                            {resetStep === "email"
                              ? "Enter your email address and we'll send you a reset token"
                              : "Enter the token from your email (or console) and your new password"}
                          </DialogDescription>
                        </DialogHeader>

                        {resetStep === "email" ? (
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label htmlFor="reset-email">Email</Label>
                              <Input
                                id="reset-email"
                                type="email"
                                placeholder="you@example.com"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                data-testid="input-reset-email"
                              />
                            </div>
                            <Button
                              className="w-full"
                              onClick={() => forgotPasswordMutation.mutate(resetEmail)}
                              disabled={!resetEmail || forgotPasswordMutation.isPending}
                              data-testid="button-request-reset"
                            >
                              {forgotPasswordMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                "Send Reset Token"
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label htmlFor="reset-token">Reset Token</Label>
                              <Input
                                id="reset-token"
                                placeholder="Enter token from email/console"
                                value={resetToken}
                                onChange={(e) => setResetToken(e.target.value)}
                                data-testid="input-reset-token"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="reset-new-password">New Password</Label>
                              <Input
                                id="reset-new-password"
                                type="password"
                                placeholder="At least 6 characters"
                                value={resetPassword}
                                onChange={(e) => setResetPassword(e.target.value)}
                                data-testid="input-reset-new-password"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="reset-confirm-password">Confirm Password</Label>
                              <Input
                                id="reset-confirm-password"
                                type="password"
                                placeholder="Repeat new password"
                                value={resetConfirmPassword}
                                onChange={(e) => setResetConfirmPassword(e.target.value)}
                                data-testid="input-reset-confirm-password"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setResetStep("email")}
                                type="button"
                              >
                                Back
                              </Button>
                              <Button
                                className="flex-1"
                                onClick={() => {
                                  if (resetPassword !== resetConfirmPassword) {
                                    toast({
                                      title: "Passwords don't match",
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                  resetPasswordMutation.mutate({
                                    token: resetToken,
                                    newPassword: resetPassword
                                  });
                                }}
                                disabled={!resetToken || !resetPassword || !resetConfirmPassword || resetPasswordMutation.isPending}
                                data-testid="button-reset-password"
                              >
                                {resetPasswordMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Resetting...
                                  </>
                                ) : (
                                  "Reset Password"
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstName">First name</Label>
                      <Input
                        id="signup-firstName"
                        placeholder="John"
                        value={signupData.firstName}
                        onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
                        data-testid="input-signup-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastName">Last name</Label>
                      <Input
                        id="signup-lastName"
                        placeholder="Doe"
                        value={signupData.lastName}
                        onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
                        data-testid="input-signup-lastname"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      required
                      data-testid="input-signup-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      required
                      data-testid="input-signup-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirmPassword">Confirm password</Label>
                    <Input
                      id="signup-confirmPassword"
                      type="password"
                      placeholder="Repeat your password"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                      required
                      data-testid="input-signup-confirm-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSigningUp}
                    data-testid="button-signup-submit"
                  >
                    {isSigningUp ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
