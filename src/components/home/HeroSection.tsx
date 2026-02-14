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
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-status-normal animate-pulse-gentle" />
            Educational Platform
          </div>

          {/* Headline */}
          <h1 className="mb-6 animate-fade-in">
            Understanding human physiology the way{" "}
            <span className="text-primary">critical care decisions</span> demand.
          </h1>

          {/* Subheading */}
          <p className="mb-10 text-lg text-muted-foreground sm:text-xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Cardiovascular, renal, and immune systems explained as dynamic, 
            interacting systems — not isolated facts.
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <Link to="/cardiovascular">
              <Button size="lg" className="gap-2">
                <BookOpen className="h-5 w-5" />
                Explore Physiology
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <EarlyAccessModal
              trigger={
                <Button size="lg" variant="outline">
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
