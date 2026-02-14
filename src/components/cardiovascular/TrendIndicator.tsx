import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  trend: 'up' | 'down' | 'stable';
  className?: string;
}

export function TrendIndicator({ trend, className }: TrendIndicatorProps) {
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  return (
    <Icon
      className={cn(
        "h-4 w-4",
        trend === 'up' && "text-status-normal",
        trend === 'down' && "text-cardio",
        trend === 'stable' && "text-muted-foreground",
        className
      )}
    />
  );
}
