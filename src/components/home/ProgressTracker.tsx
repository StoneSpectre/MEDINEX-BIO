import { useProgressTracking } from '@/hooks/useProgressTracking';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

const modules = [
  { key: 'cardiovascular' as const, name: 'Cardiovascular', path: '/cardiovascular' },
  { key: 'renal' as const, name: 'Renal', path: '/renal' },
  { key: 'immunology' as const, name: 'Immunology', path: '/immunology' },
  { key: 'systemThinking' as const, name: 'System Thinking', path: '/system-thinking' },
];

export function ProgressTracker() {
  const { progress, resetProgress, completedCount, totalModules, progressPercent } = useProgressTracking();

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Your Progress</h3>
            <p className="text-sm text-muted-foreground">
              {completedCount} of {totalModules} modules explored
            </p>
          </div>
          {completedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetProgress} className="text-muted-foreground">
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
        </div>
        
        <Progress value={progressPercent} className="h-2 mb-4" />
        
        <div className="grid grid-cols-2 gap-2">
          {modules.map((module) => (
            <Link
              key={module.key}
              to={module.path}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              {progress[module.key] ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={progress[module.key] ? 'text-foreground' : 'text-muted-foreground'}>
                {module.name}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
