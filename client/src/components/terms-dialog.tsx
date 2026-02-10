import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function TermsDialog() {
  const [agreed, setAgreed] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/accept-terms", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to accept terms");
      }
      return response.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Terms of Use & Privacy Policy</DialogTitle>
          <DialogDescription>
            Please review and accept our updated terms to continue using Outwork.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            We've published our{" "}
            <a href="/terms" target="_blank" className="text-primary underline underline-offset-4 hover:text-primary/80">
              Terms of Use
            </a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" className="text-primary underline underline-offset-4 hover:text-primary/80">
              Privacy Policy
            </a>
            . Please review them and confirm your agreement below.
          </p>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms-accept"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              data-testid="checkbox-accept-terms-dialog"
            />
            <label
              htmlFor="terms-accept"
              className="text-sm leading-relaxed cursor-pointer"
            >
              I agree to the{" "}
              <a href="/terms" target="_blank" className="text-primary underline underline-offset-4 hover:text-primary/80">
                Terms of Use
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" className="text-primary underline underline-offset-4 hover:text-primary/80">
                Privacy Policy
              </a>{" "}
              and confirm I am at least 13 years old.
            </label>
          </div>

          <Button
            className="w-full"
            disabled={!agreed || acceptTermsMutation.isPending}
            onClick={() => acceptTermsMutation.mutate()}
            data-testid="button-accept-terms-dialog"
          >
            {acceptTermsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Continuing...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
