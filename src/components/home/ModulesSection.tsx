import { Heart, Droplet, Shield, Brain } from "lucide-react";
import { ModuleCard } from "./ModuleCard";

const modules = [
  {
    title: "Cardiovascular Physiology",
    description:
      "Interactive hemodynamic models with real-time Frank-Starling curves, MAP trends, and oxygen delivery calculations.",
    icon: Heart,
    path: "/cardiovascular",
    colorClass: "text-cardio",
  },
  {
    title: "Renal Physiology",
    description:
      "Explore autoregulation curves, MAP vs GFR relationships, and understand why creatinine is a lagging marker.",
    icon: Droplet,
    path: "/renal",
    colorClass: "text-renal",
  },
  {
    title: "Immunology & Inflammation",
    description:
      "Visualize cytokine cascades, immune-vascular coupling, and understand sepsis as a coupled control failure.",
    icon: Shield,
    path: "/immunology",
    colorClass: "text-immune",
  },
  {
    title: "ICU Systems Thinking",
    description:
      "Essays on clinical reasoning: why treating numbers harms patients and why explainability beats accuracy.",
    icon: Brain,
    path: "/system-thinking",
    colorClass: "text-systems",
  },
];

export function ModulesSection() {
  return (
    <section className="py-16 sm:py-24">
      <div className="container">
        <div className="mb-12 text-center">
          <h2 className="mb-4">Explore Physiology Modules</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Each module presents physiology as interconnected systems with
            real-time visualizations and clinical interpretations.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((module, index) => (
            <ModuleCard
              key={module.path}
              {...module}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
