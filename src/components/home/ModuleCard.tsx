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
      <article className="relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card p-7 transition-all duration-500 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1">
        {/* Icon */}
        <div
          className={cn(
            "mb-4 flex h-12 w-12 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110",
            colorClass === "text-cardio" && "bg-cardio/10",
            colorClass === "text-renal" && "bg-renal/10",
            colorClass === "text-immune" && "bg-immune/10",
            colorClass === "text-systems" && "bg-systems/10",
            colorClass === "text-purple-500" && "bg-purple-500/10",
            colorClass === "text-pink-500" && "bg-pink-500/10",
            colorClass === "text-orange-500" && "bg-orange-500/10",
            colorClass === "text-blue-500" && "bg-blue-500/10",
            colorClass === "text-yellow-500" && "bg-yellow-500/10",
            colorClass === "text-sky-500" && "bg-sky-500/10"
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
