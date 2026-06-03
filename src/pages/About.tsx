import { Layout } from "@/components/layout/Layout";
import { Database, Network, Brain, Activity, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const About = () => {
  return (
    <Layout>
      <div className="container py-12 sm:py-16 max-w-4xl">
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="outline" className="mb-4">The Vision</Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">
            Building the Biomedical Intelligence OS
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Medinex is evolving from an educational tool into a comprehensive intelligence ecosystem connecting literature, datasets, and clinical reasoning.
          </p>
        </div>

        <div className="space-y-16">
          {/* Layered Architecture Section */}
          <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-2xl font-semibold mb-8 text-center flex items-center justify-center gap-2">
              <Network className="h-6 w-6 text-primary" /> The Layered Architecture
            </h2>
            
            <div className="space-y-6">
              {/* Layer 1 */}
              <Card className="border-border/60 hover:border-primary/30 transition-colors bg-gradient-to-r from-background to-muted/20">
                <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Database className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Layer 1: Data Intelligence</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      We aggregate scattered biomedical knowledge directly into the browser. By hooking into live APIs from PubMed, ClinicalTrials.gov, and the World Health Organization, we create a unified Biomedical Data Lake that is always up-to-date.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Layer 2 */}
              <Card className="border-border/60 hover:border-primary/30 transition-colors bg-gradient-to-r from-background to-muted/20">
                <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
                  <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Network className="h-6 w-6 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Layer 2: Knowledge Graph Engine</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Raw data is mapped to structured clinical models (like our Cardiovascular and Renal simulations). We map diseases to their physiological root causes, creating a living, interactive graph of human health and pathology.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Layer 3 */}
              <Card className="border-border/60 hover:border-primary/30 transition-colors bg-gradient-to-r from-background to-muted/20">
                <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
                  <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Brain className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Layer 3: AI Reasoning & Workspace</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      We provide a unified interface for students, researchers, and clinicians to explore this graph. Our future roadmap includes GraphRAG (Retrieval-Augmented Generation) to help researchers synthesize papers and surface hidden biomedical connections.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* GTM Strategy */}
          <section className="bg-muted/30 p-8 rounded-2xl border border-border/50 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-2 mb-6">
              <Target className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Strategic Roadmap</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-8">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" /> Current Phase: Research & Education
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We are building tools that students and researchers use daily. By providing immediate value through our Literature Studio and Concept Explorers, we seed the ecosystem with user engagement and validate our data pipelines.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" /> Future Phase: Clinical Utility
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  As our Knowledge Graph expands, Medinex will transition from a learning platform into a robust research ecosystem, eventually laying the groundwork for verifiable, graph-backed diagnostic support tools.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

// Extracted Badge component for localized use if not imported globally
function Badge({ children, variant = "default", className = "" }: { children: React.ReactNode, variant?: string, className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variant === 'outline' ? 'border border-primary text-primary' : 'bg-primary text-primary-foreground hover:bg-primary/80'} ${className}`}>
      {children}
    </span>
  );
}

export default About;
