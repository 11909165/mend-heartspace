import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock, Heart, Brain, Sparkles, Sun } from "lucide-react";

const blogPosts = [
  {
    id: 1,
    title: "Adolescent Mental Health: Key Global Facts",
    excerpt: "One in seven 10-19-year-olds experiences a mental disorder. Explore the critical factors affecting adolescent well-being and WHO's global response.",
    category: "Global Health",
    date: "March 20, 2026",
    readTime: "8 min read",
    icon: Brain,
    gradient: "from-purple-500/20 to-indigo-500/20",
    iconColor: "text-purple-400",
    url: "https://www.who.int/news-room/fact-sheets/detail/adolescent-mental-health"
  },
  {
    id: 2,
    title: "Suicide Prevention: A Global Framework",
    excerpt: "Suicide is a major public health challenge. Learn about the 'LIVE LIFE' approach and evidence-based interventions to support those at risk.",
    category: "Prevention",
    date: "April 5, 2026",
    readTime: "10 min read",
    icon: Heart,
    gradient: "from-rose-500/20 to-pink-500/20",
    iconColor: "text-rose-400",
    url: "https://www.who.int/news-room/fact-sheets/detail/suicide"
  },
  {
    id: 3,
    title: "The Power of Listening: The LIVES Approach",
    excerpt: "How active, non-judgmental listening can save lives. Discover the structured approach used by experts to provide psychological first aid.",
    category: "Practices",
    date: "April 10, 2026",
    readTime: "6 min read",
    icon: Sparkles,
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-400",
    url: "https://www.who.int/news-room/feature-stories/detail/the-power-of-listening--the-power-of-the-lives-approach"
  },
  {
    id: 4,
    title: "Responsible AI for Mental Health & Well-being",
    excerpt: "Experts chart the way forward for integrating AI into mental health support while ensuring safety, transparency, and human-centric care.",
    category: "Technology",
    date: "March 28, 2026",
    readTime: "5 min read",
    icon: Sun,
    gradient: "from-teal-500/20 to-emerald-500/20",
    iconColor: "text-teal-400",
    url: "https://www.who.int/news/item/20-03-2026-towards-responsible-ai-for-mental-health-and-well-being--experts-chart-a-way-forward"
  },
];

export default function Blog() {
  return (
    <Layout>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                MEND Blog
              </span>
              <h1 className="text-4xl md:text-5xl font-serif font-medium mb-6 tracking-tight">
                Insights for Your{" "}
                <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  Emotional Journey
                </span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Explore articles on emotional wellness, self-awareness, and the
                science behind building healthier emotional habits.
              </p>
            </div>
          </div>
        </section>

        {/* Blog Posts Grid */}
        <section className="py-12 pb-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {blogPosts.map((post) => {
                const IconComponent = post.icon;
                return (
                  <a
                    key={post.id}
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 block"
                  >
                    {/* Card Header with Gradient */}
                    <div
                      className={`h-40 bg-gradient-to-br ${post.gradient} flex items-center justify-center relative`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                      <IconComponent
                        className={`w-12 h-12 ${post.iconColor} relative z-10 group-hover:scale-110 transition-transform duration-300`}
                      />
                    </div>

                    {/* Card Content */}
                    <div className="p-6">
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                          {post.category}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {post.date}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {post.readTime}
                        </div>
                      </div>

                      <h2 className="text-xl font-serif font-medium mb-3 group-hover:text-primary transition-colors">
                        {post.title}
                      </h2>

                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        {post.excerpt}
                      </p>

                      <div className="flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
                        Explore WHO Insight
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>

            {/* Coming Soon Note */}
            <div className="mt-16 text-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-muted/50 border border-border/50">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  More articles coming soon. Stay tuned for weekly insights!
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
