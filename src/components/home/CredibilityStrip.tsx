import { BookOpen, Lock, Shield } from "lucide-react";

const credibilityItems = [
  {
    icon: BookOpen,
    text: "Built on clinical physiology principles",
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
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {credibilityItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="flex items-center gap-2.5 text-sm text-muted-foreground"
              >
                <Icon className="h-4 w-4" />
                <span>{item.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
