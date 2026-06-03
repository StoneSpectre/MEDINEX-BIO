import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import EarlyAccessModal from "@/components/common/EarlyAccessModal";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 gradient-clinical opacity-50" />
      
      <div className="container relative py-20 sm:py-28 lg:py-36">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            Live Platform
          </div>

          {/* Headline */}
          <h1 className="mb-6 animate-fade-in text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            The <span className="text-primary">Biomedical Intelligence</span> Operating System
          </h1>

          {/* Subheading */}
          <p className="mb-10 text-lg text-muted-foreground sm:text-xl animate-fade-in max-w-2xl mx-auto" style={{ animationDelay: "0.1s" }}>
            Connecting medical literature, clinical datasets, and dynamic physiological models into one continuously evolving intelligence network.
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in mt-4" style={{ animationDelay: "0.2s" }}>
            <Link to="/cardiovascular">
              <Button size="lg" className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5">
                <BookOpen className="h-5 w-5" />
                Explore Physiology
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <EarlyAccessModal
              trigger={
                <Button size="lg" variant="outline" className="bg-background/50 backdrop-blur-sm border-border/60 hover:bg-muted/50 transition-all hover:-translate-y-0.5">
                  Join Early Access (Free)
                </Button>
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
