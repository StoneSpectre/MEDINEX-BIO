import { BookOpen, Lock, Shield } from "lucide-react";

const credibilityItems = [
  {
    icon: BookOpen,
    text: "Multi-Source Synthesized Knowledge Base",
  },
  {
    icon: Lock,
    text: "No patient data",
  },
  {
    icon: Shield,
    text: "Educational & exploratory platform",
  },
];

export function CredibilityStrip() {
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="container py-6">
        <div className="grid grid-cols-1 gap-y-4 md:grid-cols-3 md:gap-x-8">
          {credibilityItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="flex items-center justify-center gap-2.5 text-sm text-muted-foreground py-2 md:py-0"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-center md:text-left">{item.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
