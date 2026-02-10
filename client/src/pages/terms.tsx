import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <a href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </a>
        </Button>

        <h1 className="text-3xl font-serif font-bold mb-2">Terms of Use</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 9, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By creating an account or using Outwork, you agree to be bound by these Terms of Use. If you do not agree to these terms, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Outwork is a free workout tracking application that allows you to plan workouts, log exercises, track supplements, and monitor your fitness progress. The service is provided as-is for personal, non-commercial use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Age Requirement</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 13 years of age to use Outwork. By using the service, you represent and warrant that you are at least 13 years old.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate information when creating your account and to notify us of any unauthorized use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. User Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to misuse the service, including but not limited to: attempting to gain unauthorized access to the service or its systems, using the service for any unlawful purpose, or interfering with other users' use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Service Modifications and Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify, suspend, or discontinue the service at any time, with or without notice. We may also terminate or suspend your account at our discretion if you violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. No Guarantees</h2>
            <p className="text-muted-foreground leading-relaxed">
              Outwork is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the service will be uninterrupted, error-free, or that your data will be preserved indefinitely. You are encouraged to export your data regularly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the fullest extent permitted by law, Outwork and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, use, or profits, arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">9. Hosting</h2>
            <p className="text-muted-foreground leading-relaxed">
              Outwork is hosted on Vercel. Your use of the service is also subject to Vercel's terms and policies as they apply to hosted applications.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">10. Changes to These Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms of Use from time to time. If we make material changes, you will be asked to review and accept the updated terms before continuing to use the service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
