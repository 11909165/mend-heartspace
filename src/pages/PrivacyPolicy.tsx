import { Layout } from "@/components/layout/Layout";
import { Shield } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <Layout>
      <div className="min-h-screen">
        {/* Hero */}
        <section className="relative py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-serif font-medium mb-4 tracking-tight">
                Privacy Policy
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
              <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
                <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-8 space-y-6">
                  <div>
                    <h2 className="text-2xl font-serif font-medium mb-3">1. Introduction</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      At MEND, your privacy is our priority. This Privacy Policy
                      explains how we collect, use, disclose, and safeguard your
                      information when you use our emotional wellness platform.
                      We are committed to protecting your personal and emotional
                      data with the highest standards of security.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-serif font-medium mb-3">
                      2. Information We Collect
                    </h2>
                    <p className="text-muted-foreground leading-relaxed mb-3">
                      We collect information that you provide directly to us,
                      including:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
                      <li>
                        Account information (email address, name, password)
                      </li>
                      <li>
                        Emotional check-in data and journal entries
                      </li>
                      <li>
                        Conversations with the AI companion
                      </li>
                      <li>
                        Community interactions and posts
                      </li>
                      <li>
                        Usage data and analytics to improve our services
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-serif font-medium mb-3">
                      3. How We Use Your Information
                    </h2>
                    <p className="text-muted-foreground leading-relaxed mb-3">
                      We use the information we collect to:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
                      <li>
                        Provide, maintain, and improve our services
                      </li>
                      <li>
                        Personalize your emotional wellness experience
                      </li>
                      <li>
                        Generate insights and patterns from your check-ins
                      </li>
                      <li>
                        Send you relevant notifications and updates
                      </li>
                      <li>
                        Ensure the safety and security of our platform
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-serif font-medium mb-3">
                      4. Data Protection
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Your emotional data is encrypted at rest and in transit. We
                      implement industry-standard security measures including
                      AES-256 encryption, secure authentication protocols, and
                      regular security audits. We never sell your personal data
                      to third parties.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-serif font-medium mb-3">
                      5. AI & Data Processing
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Our AI companion processes your conversations to provide
                      personalized support. This processing happens in real-time
                      and your conversations are stored securely. We do not use
                      your personal conversations to train our AI models without
                      explicit consent.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-serif font-medium mb-3">
                      6. Your Rights
                    </h2>
                    <p className="text-muted-foreground leading-relaxed mb-3">
                      You have the right to:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
                      <li>Access and download your personal data</li>
                      <li>Request deletion of your account and data</li>
                      <li>Opt out of non-essential data collection</li>
                      <li>Update or correct your personal information</li>
                      <li>Withdraw consent at any time</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-serif font-medium mb-3">
                      7. Contact Us
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      If you have any questions about this Privacy Policy, please
                      contact us at{" "}
                      <a
                        href="mailto:privacy@mendapp.com"
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
          </div>
        </section>
      </div>
    </Layout>
  );
}
