import React from 'react';

interface GlomerularDiagramProps {
  afferentResistance: number;
  efferentResistance: number;
  glomerularPressure: number;
  netFiltrationPressure: number;
}

const GlomerularDiagram: React.FC<GlomerularDiagramProps> = ({
  afferentResistance,
  efferentResistance,
  glomerularPressure,
  netFiltrationPressure
}) => {
  // Calculate visual sizes based on resistance (inverse relationship for vessel width)
  const afferentWidth = Math.max(4, 20 / afferentResistance);
  const efferentWidth = Math.max(4, 20 / efferentResistance);
  
  // Pressure indicator color
  const getPressureColor = (pressure: number) => {
    if (pressure < 5) return 'hsl(var(--status-critical))';
    if (pressure < 10) return 'hsl(var(--status-warning))';
    return 'hsl(var(--status-normal))';
  };
  
  return (
    <div className="w-full bg-card rounded-lg p-4 border border-border">
      <h3 className="text-sm font-medium text-foreground mb-4">Glomerular Pressures</h3>
      
      <div className="relative w-full h-48 flex items-center justify-center">
        <svg viewBox="0 0 300 150" className="w-full h-full max-w-md">
          {/* Bowman's Capsule */}
          <ellipse
            cx="150"
            cy="75"
            rx="60"
            ry="50"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="2"
          />
          <text x="150" y="135" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
            Bowman's Capsule
          </text>
          
          {/* Glomerular Capillary Tuft */}
          <circle
            cx="150"
            cy="70"
            r="30"
            fill="hsl(var(--renal))"
            fillOpacity="0.2"
            stroke="hsl(var(--renal))"
            strokeWidth="2"
          />
          
          {/* Afferent Arteriole */}
          <path
            d={`M 30 60 Q 70 60 90 65`}
            stroke="hsl(var(--status-critical))"
            strokeWidth={afferentWidth}
            fill="none"
            strokeLinecap="round"
          />
          <text x="40" y="50" fontSize="9" fill="hsl(var(--muted-foreground))">Afferent</text>
          
          {/* Efferent Arteriole */}
          <path
            d={`M 210 65 Q 230 60 270 60`}
            stroke="hsl(var(--primary))"
            strokeWidth={efferentWidth}
            fill="none"
            strokeLinecap="round"
          />
          <text x="240" y="50" fontSize="9" fill="hsl(var(--muted-foreground))">Efferent</text>
          
          {/* Filtration Arrows */}
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="0" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="hsl(var(--renal))" />
            </marker>
          </defs>
          
          {netFiltrationPressure > 0 && (
            <>
              <line x1="150" y1="45" x2="150" y2="25" stroke="hsl(var(--renal))" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <line x1="170" y1="55" x2="185" y2="40" stroke="hsl(var(--renal))" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <line x1="130" y1="55" x2="115" y2="40" stroke="hsl(var(--renal))" strokeWidth="2" markerEnd="url(#arrowhead)" />
            </>
          )}
          
          {/* Pressure Labels */}
          <g transform="translate(145, 70)">
            <text textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--foreground))">
              {glomerularPressure}
            </text>
            <text y="12" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">
              mmHg
            </text>
          </g>
        </svg>
      </div>
      
      {/* Pressure Legend */}
      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-renal" />
          <span className="text-muted-foreground">Glomerular P: </span>
          <span className="font-medium">{glomerularPressure} mmHg</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: getPressureColor(netFiltrationPressure) }}
          />
          <span className="text-muted-foreground">Net Filtration: </span>
          <span className="font-medium">{netFiltrationPressure} mmHg</span>
        </div>
      </div>
    </div>
  );
};

export default GlomerularDiagram;
