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
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 2, 2026</p>

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
            <h2 className="text-xl font-semibold mb-2">10. AI-Generated Training Plans</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Outwork includes an AI-powered training planner that generates personalized workout plans based on your stated goals and fitness history. By using this feature, you acknowledge and agree to the following:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                <strong className="text-foreground">Not professional advice.</strong> AI-generated training plans are for informational and personal use only. They do not constitute professional medical, fitness, or nutritional advice. You should consult a qualified healthcare or fitness professional before beginning any new exercise program, particularly if you have a medical condition, injury, or other health concern.
              </li>
              <li>
                <strong className="text-foreground">Third-party AI providers.</strong> When you use the training planner, your stated fitness goals, a summary of your exercise library, and up to 90 days of your training history are transmitted to a third-party AI provider to generate your plan. The default provider is Google Gemini; this may be configured to Anthropic Claude or OpenAI. Each provider operates under its own terms of service and privacy policy.
              </li>
              <li>
                <strong className="text-foreground">No guarantee of accuracy.</strong> AI-generated plans may contain errors, omissions, or recommendations that are unsuitable for your individual health status, fitness level, or goals. Outwork does not warrant the accuracy, completeness, or appropriateness of any AI-generated content.
              </li>
              <li>
                <strong className="text-foreground">Your responsibility.</strong> You are solely responsible for how you use any AI-generated training plan. Outwork and its creators are not liable for any injury, health issue, or adverse outcome resulting from following an AI-generated plan.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">11. Changes to These Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms of Use from time to time. If we make material changes, you will be asked to review and accept the updated terms before continuing to use the service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
