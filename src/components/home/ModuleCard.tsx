import { LucideIcon, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  colorClass: string;
  delay?: number;
}

export function ModuleCard({
  title,
  description,
  icon: Icon,
  path,
  colorClass,
  delay = 0,
}: ModuleCardProps) {
  return (
    <Link
      to={path}
      className="group animate-fade-in"
      style={{ animationDelay: `${delay}s` }}
    >
      <article className="relative h-full overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
        {/* Icon */}
        <div
          className={cn(
            "mb-4 flex h-12 w-12 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110",
            colorClass === "text-cardio" && "bg-cardio/10",
            colorClass === "text-renal" && "bg-renal/10",
            colorClass === "text-immune" && "bg-immune/10",
            colorClass === "text-systems" && "bg-systems/10"
          )}
        >
          <Icon className={cn("h-6 w-6", colorClass)} />
        </div>

        {/* Content */}
        <h3 className="mb-2 text-lg font-medium">{title}</h3>
        <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>

        {/* Arrow indicator */}
        <div className="flex items-center gap-1 text-sm font-medium text-primary transition-transform duration-300 group-hover:translate-x-1">
          Explore module
          <ArrowRight className="h-4 w-4" />
        </div>

        {/* Decorative gradient on hover */}
        <div
          className={cn(
            "absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none",
            "bg-gradient-to-br from-transparent via-transparent to-primary/5"
          )}
        />
      </article>
    </Link>
  );
}
