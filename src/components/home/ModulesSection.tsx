import { Heart, Droplet, Shield, Brain, Zap, Baby, Waves, Wind, ActivitySquare, Eye, Ear, ChevronLeft, ChevronRight } from "lucide-react";
import { ModuleCard } from "./ModuleCard";
import { useRef } from "react";

const modules = [
  {
    title: "Cardiovascular Physiology",
    description: "Interactive hemodynamic models with real-time Frank-Starling curves, MAP trends, and oxygen delivery calculations.",
    icon: Heart,
    path: "/cardiovascular",
    colorClass: "text-cardio",
  },
  {
    title: "Renal Physiology",
    description: "Explore autoregulation curves, MAP vs GFR relationships, and understand why creatinine is a lagging marker.",
    icon: Droplet,
    path: "/renal",
    colorClass: "text-renal",
  },
  {
    title: "Immunology & Inflammation",
    description: "Visualize cytokine cascades, immune-vascular coupling, and understand sepsis as a coupled control failure.",
    icon: Shield,
    path: "/immunology",
    colorClass: "text-immune",
  },
  {
    title: "ICU Systems Thinking",
    description: "Essays on clinical reasoning: why treating numbers harms patients and why explainability beats accuracy.",
    icon: Brain,
    path: "/system-thinking",
    colorClass: "text-systems",
  },
  {
    title: "Nervous System",
    description: "Analyze action potentials, neurotransmitter dynamics, and explore the pathology of neurodegenerative states.",
    icon: Zap,
    path: "/nervous",
    colorClass: "text-purple-500",
  },
  {
    title: "Reproductive",
    description: "Track complex hormonal feedback loops, ovarian cycles, and physiological changes during gestation.",
    icon: Baby,
    path: "/reproductive",
    colorClass: "text-pink-500",
  },
  {
    title: "Hepatic",
    description: "Understand hepatic lobule hemodynamics, bilirubin metabolism, and portal hypertension mechanisms.",
    icon: Waves,
    path: "/hepatic",
    colorClass: "text-orange-500",
  },
  {
    title: "Respiratory",
    description: "Visualize V/Q mismatch, alveolar gas equations, and the mechanics of ARDS.",
    icon: Wind,
    path: "/respiratory",
    colorClass: "text-blue-500",
  },
  {
    title: "Endocrine",
    description: "Explore the HPA axis, thyroid regulation, and the multi-system impact of hormone imbalances.",
    icon: ActivitySquare,
    path: "/endocrine",
    colorClass: "text-yellow-500",
  },
  {
    title: "Ophthalmology",
    description: "Analyze aqueous humor dynamics, retinal phototransduction, and glaucoma pathophysiology.",
    icon: Eye,
    path: "/ophthalmology",
    colorClass: "text-sky-500",
  },
  {
    title: "ENT",
    description: "Discover vestibular balance, auditory transduction, and the mechanisms of conductive vs sensorineural loss.",
    icon: Ear,
    path: "/ent",
    colorClass: "text-orange-500",
  },
];

export function ModulesSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section className="py-16 sm:py-24 overflow-hidden relative">
      <div className="container mb-20 text-center">
        <h2 className="mb-4">Explore Physiology Modules</h2>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Each module presents physiology as interconnected systems with
          real-time visualizations and clinical interpretations.
        </p>
      </div>

      <div className="relative w-full max-w-[100vw] group">
        {/* Left Arrow */}
        <button 
          onClick={() => scroll("left")}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 hidden h-12 w-12 items-center justify-center rounded-full bg-background/80 text-foreground border border-border/50 shadow-lg backdrop-blur-sm transition-all hover:bg-background hover:scale-110 sm:group-hover:flex"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Scrollable Container */}
        <div 
          ref={scrollContainerRef}
          className="flex w-full gap-6 overflow-x-auto snap-x snap-mandatory py-10 px-6 sm:px-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {modules.map((module) => (
            <div key={module.path} className="w-[300px] sm:w-[380px] shrink-0 snap-center">
              <ModuleCard {...module} delay={0} />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button 
          onClick={() => scroll("right")}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 hidden h-12 w-12 items-center justify-center rounded-full bg-background/80 text-foreground border border-border/50 shadow-lg backdrop-blur-sm transition-all hover:bg-background hover:scale-110 sm:group-hover:flex"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </section>
  );
}
