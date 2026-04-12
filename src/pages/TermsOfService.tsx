import { Layout } from "@/components/layout/Layout";
import { FileText } from "lucide-react";

export default function TermsOfService() {
  return (
    <Layout>
      <div className="min-h-screen">
        {/* Hero */}
        <section className="relative py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-serif font-medium mb-4 tracking-tight">
                Terms of Service
              </h1>
              <p className="text-muted-foreground">
                Last updated: April 1, 2026
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12 pb-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-serif font-medium mb-3">
                    1. Acceptance of Terms
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    By accessing or using MEND, you agree to be bound by these
                    Terms of Service. If you do not agree to these terms, please
                    do not use our services. These terms apply to all users of
                    the platform, including visitors, registered users, and
                    contributors.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-medium mb-3">
                    2. Description of Service
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    MEND is an emotional wellness platform that provides AI-powered
                    emotional support, journaling tools, mood tracking, community
                    support circles, and personalized insights. Our service is
                    designed to complement — not replace — professional mental
                    health care.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-medium mb-3">
                    3. Important Disclaimer
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    MEND is not a substitute for professional mental health
                    treatment. Our AI companion is not a licensed therapist or
                    counselor. If you are experiencing a mental health crisis,
                    please contact emergency services or a mental health
                    professional immediately.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-medium mb-3">
                    4. User Accounts
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    You are responsible for maintaining the confidentiality of
                    your account credentials and for all activities under your
                    account. You must provide accurate, current, and complete
                    information during registration and keep your account
                    information up to date.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-medium mb-3">
                    5. Acceptable Use
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    You agree not to use MEND to:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
                    <li>Harass, abuse, or harm other users</li>
                    <li>Share misleading or harmful information</li>
                    <li>
                      Attempt to reverse engineer or exploit our AI systems
                    </li>
                    <li>Violate any applicable laws or regulations</li>
                    <li>
                      Use the platform for commercial purposes without
                      authorization
                    </li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-medium mb-3">
                    6. Community Guidelines
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    When participating in Support Circles and community features,
                    you agree to treat all members with respect and empathy. Hate
                    speech, discrimination, and intentionally harmful content are
                    strictly prohibited and may result in account suspension.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-medium mb-3">
                    7. Changes to Terms
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We may update these Terms of Service from time to time. We
                    will notify you of any material changes by posting the new
                    terms on this page and updating the "Last updated" date. Your
                    continued use of MEND after changes constitutes acceptance of
                    the updated terms.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-medium mb-3">
                    10. Contact
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    For questions about these Terms of Service, please contact us
                    at{" "}
                    <a
                      href="mailto:legal@mendapp.com"
                      className="text-primary hover:underline"
                    >
                      support@mendmyway.com
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
