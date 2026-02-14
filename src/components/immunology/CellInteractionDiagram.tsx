import React from 'react';
import { CytokineState } from '@/lib/physiology/immunology';

interface CellInteractionDiagramProps {
  cytokines: CytokineState;
  phase: 'innate' | 'transition' | 'adaptive';
  macrophageActivity: number;
  tCellCount: number;
}

const CellInteractionDiagram: React.FC<CellInteractionDiagramProps> = ({
  cytokines,
  phase,
  macrophageActivity,
  tCellCount
}) => {
  const getActivityOpacity = (activity: number) => Math.max(0.3, activity / 100);
  const getCytokineWidth = (level: number, max: number) => Math.max(1, (level / max) * 4);

  return (
    <div className="w-full bg-card rounded-lg p-4 border border-border">
      <h3 className="text-sm font-medium text-foreground mb-4">Immune Cell Interactions</h3>
      
      <div className="relative w-full h-64">
        <svg viewBox="0 0 400 200" className="w-full h-full">
          {/* Pathogen */}
          <g transform="translate(50, 100)">
            <circle r="20" fill="hsl(var(--status-critical))" fillOpacity="0.8" />
            <text y="35" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
              Pathogen
            </text>
          </g>
          
          {/* Macrophage */}
          <g transform="translate(150, 60)">
            <circle 
              r="25" 
              fill="hsl(var(--status-warning))" 
              fillOpacity={getActivityOpacity(macrophageActivity)}
              stroke="hsl(var(--status-warning))"
              strokeWidth="2"
            />
            <text y="40" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
              Macrophage
            </text>
            <text y="52" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">
              ({macrophageActivity}% active)
            </text>
          </g>
          
          {/* T Cell */}
          <g transform="translate(300, 100)">
            <circle 
              r="22" 
              fill="hsl(var(--primary))" 
              fillOpacity={phase === 'adaptive' ? 0.8 : phase === 'transition' ? 0.5 : 0.2}
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />
            <text y="38" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
              T Cell
            </text>
            <text y="50" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">
              ({tCellCount}/μL)
            </text>
          </g>
          
          {/* Dendritic Cell */}
          <g transform="translate(200, 150)">
            <polygon 
              points="0,-18 15,12 -15,12" 
              fill="hsl(var(--immunology))" 
              fillOpacity={phase !== 'innate' ? 0.7 : 0.3}
              stroke="hsl(var(--immunology))"
              strokeWidth="2"
            />
            <text y="30" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
              Dendritic
            </text>
          </g>
          
          {/* Cytokine Arrows */}
          <defs>
            <marker id="cytokineArrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="hsl(var(--foreground))" fillOpacity="0.5" />
            </marker>
          </defs>
          
          {/* TNF-α from Macrophage */}
          <line 
            x1="170" y1="45" x2="200" y2="30"
            stroke="hsl(var(--status-critical))"
            strokeWidth={getCytokineWidth(cytokines.tnfAlpha, 50)}
            markerEnd="url(#cytokineArrow)"
          />
          <text x="195" y="25" fontSize="8" fill="hsl(var(--status-critical))">
            TNF-α
          </text>
          
          {/* IL-6 from Macrophage to T Cell */}
          <line 
            x1="175" y1="65" x2="275" y2="95"
            stroke="hsl(var(--primary))"
            strokeWidth={getCytokineWidth(cytokines.il6, 50)}
            strokeDasharray="4 2"
            markerEnd="url(#cytokineArrow)"
          />
          <text x="220" y="75" fontSize="8" fill="hsl(var(--primary))">
            IL-6
          </text>
          
          {/* IFN-γ from T Cell */}
          {phase !== 'innate' && (
            <>
              <line 
                x1="280" y1="85" x2="220" y2="55"
                stroke="hsl(var(--immunology))"
                strokeWidth={getCytokineWidth(cytokines.interferonGamma, 30)}
                markerEnd="url(#cytokineArrow)"
              />
              <text x="240" y="60" fontSize="8" fill="hsl(var(--immunology))">
                IFN-γ
              </text>
            </>
          )}
          
          {/* IL-10 (anti-inflammatory) */}
          <line 
            x1="150" y1="85" x2="100" y2="100"
            stroke="hsl(var(--status-normal))"
            strokeWidth={getCytokineWidth(cytokines.il10, 30)}
            strokeDasharray="2 2"
          />
          <text x="110" y="85" fontSize="8" fill="hsl(var(--status-normal))">
            IL-10
          </text>
          
          {/* Phagocytosis arrow */}
          <line 
            x1="70" y1="100" x2="120" y2="75"
            stroke="hsl(var(--foreground))"
            strokeWidth="2"
            strokeDasharray="4 2"
            markerEnd="url(#cytokineArrow)"
            opacity="0.5"
          />
        </svg>
      </div>
      
      {/* Phase Indicator */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <span className={`text-xs px-2 py-1 rounded ${phase === 'innate' ? 'bg-status-critical/20 text-status-critical' : 'bg-muted text-muted-foreground'}`}>
          Innate
        </span>
        <span className="text-muted-foreground">→</span>
        <span className={`text-xs px-2 py-1 rounded ${phase === 'transition' ? 'bg-status-warning/20 text-status-warning' : 'bg-muted text-muted-foreground'}`}>
          Transition
        </span>
        <span className="text-muted-foreground">→</span>
        <span className={`text-xs px-2 py-1 rounded ${phase === 'adaptive' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
          Adaptive
        </span>
      </div>
    </div>
  );
};

export default CellInteractionDiagram;
