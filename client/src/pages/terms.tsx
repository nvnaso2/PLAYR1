import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background safe-area-top">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/">
          <Button variant="ghost" className="mb-8 gap-2" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-6" data-testid="text-terms-title">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 2026</p>

        <div className="prose prose-sm dark:prose-invert space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using PLAYR1, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Account Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the security of your account credentials. You must provide accurate information when creating your account. Users under 18 must have a parent or guardian who acknowledges their use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to use PLAYR1 only for lawful purposes related to basketball training and development. You may not upload inappropriate content, harass other users, or attempt to interfere with the platform's operation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Content Ownership</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of content you upload, including training videos and drill data. By uploading content, you grant PLAYR1 a license to display it within the platform as needed to provide our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Payments & Subscriptions</h2>
            <p className="text-muted-foreground leading-relaxed">
              Paid features are billed through Stripe. Subscription terms, pricing, and cancellation policies are presented at the time of purchase. Refunds are handled on a case-by-case basis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              PLAYR1 is provided "as is" without warranties. We are not liable for any injuries resulting from following training content on the platform. Always consult with a qualified coach or medical professional before starting any training program.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Modifications</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these terms from time to time. Continued use of PLAYR1 after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these terms, contact us at support@playr1.app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
