import { Layout } from "@/components/layout/Layout";
import { Cookie } from "lucide-react";

export default function CookiePolicy() {
  return (
    <Layout>
      <div className="min-h-screen">
        {/* Hero */}
        <section className="relative py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6">
                <Cookie className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-serif font-medium mb-4 tracking-tight">
                Cookie Policy
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
                    1. What Are Cookies
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Cookies are small text files that are stored on your device
                    when you visit a website. They help us provide you with a
                    better experience by remembering your preferences and
                    understanding how you use our platform.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-medium mb-3">
                    2. How We Use Cookies
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    MEND uses cookies for the following purposes:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
                    <li>
                      <strong className="text-foreground">Essential Cookies:</strong>{" "}
                      Required for the platform to function properly, including
                      authentication and session management
                    </li>
                    <li>
                      <strong className="text-foreground">Preference Cookies:</strong>{" "}
                      Remember your settings such as theme preference (light/dark
                      mode) and sidebar state
                    </li>
                    <li>
                      <strong className="text-foreground">Analytics Cookies:</strong>{" "}
                      Help us understand how you use MEND so we can improve the
                      experience
                    </li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-medium mb-3">
                    3. Managing Cookies
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    You can control and manage cookies through your browser
                    settings. Most browsers allow you to block or delete cookies.
                    However, please note that disabling essential cookies may
                    affect the functionality of MEND, including the ability to
                    log in and use personalized features.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-medium mb-3">
                    4. Updates to This Policy
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We may update this Cookie Policy from time to time to reflect
                    changes in our practices or for operational, legal, or
                    regulatory reasons. We will notify you of significant changes
                    by posting a notice on our platform.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-medium mb-3">
                    5. Contact Us
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    If you have questions about our use of cookies, please
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
        </section>
      </div>
    </Layout>
  );
}
