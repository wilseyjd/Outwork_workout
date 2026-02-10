import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <a href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </a>
        </Button>

        <h1 className="text-3xl font-serif font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 9, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              When you use Outwork, we collect the following information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Email address (used for account login and password recovery)</li>
              <li>Password (stored securely using bcrypt hashing — we never store plaintext passwords)</li>
              <li>First and last name (optional, provided during signup)</li>
              <li>Workout data you enter (exercises, sets, reps, weights, templates, sessions, supplements, body weight)</li>
              <li>Basic web analytics (page views, general usage patterns) collected for site improvement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information is used solely to provide and improve the Outwork service:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>To authenticate your account and maintain your session</li>
              <li>To store and display your workout data back to you</li>
              <li>To enable features like workout history, progress tracking, and data export</li>
              <li>To understand general usage patterns and improve the application</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell, rent, or share your personal data with third parties. Your workout data is private to your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Hosting and Infrastructure</h2>
            <p className="text-muted-foreground leading-relaxed">
              Outwork is hosted on Vercel. Your data is stored in a PostgreSQL database managed through our hosting infrastructure. Vercel, as our hosting provider, may process requests and logs as part of normal service operation. Please refer to Vercel's privacy policy for details on their data handling practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your account and workout data are retained as long as your account is active. You can export your data at any time using the export feature in the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Data Deletion</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may request deletion of your account and all associated data by contacting us. Upon account deletion, all your personal data and workout records will be permanently removed from our systems.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Cookies and Sessions</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use a session cookie to keep you logged in. This cookie is essential for the service to function and contains only a session identifier. We do not use advertising or third-party tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Age Restriction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Outwork is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has created an account, please contact us so we can remove the account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. If we make material changes, you will be asked to review and accept the updated policy before continuing to use the service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
