import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp,
  Activity,
  Filter
} from "lucide-react";
import { 
  calculateRenalFunction, 
  generateAutoregulationCurve,
  RenalInputs,
  RenalOutputs,
  getRenalInterpretation
} from "@/lib/physiology/renal";
import { TrendIndicator } from "@/components/cardiovascular/TrendIndicator";
import AutoregulationChart from "./AutoregulationChart";
import GlomerularDiagram from "./GlomerularDiagram";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAnalytics } from "@/hooks/useAnalytics";

const getTrend = (current: number, prev: number | undefined): 'up' | 'down' | 'stable' => {
  if (prev === undefined) return 'stable';
  const diff = current - prev;
  if (Math.abs(diff) < 0.5) return 'stable';
  return diff > 0 ? 'up' : 'down';
};

// Parameter definitions with clinical context
const parameterDefinitions = {
  meanArterialPressure: {
    label: "Mean Arterial Pressure",
    unit: "mmHg",
    min: 40,
    max: 160,
    default: 93,
    step: 1,
    description: "Driving pressure for renal perfusion"
  },
  afferentResistance: {
    label: "Afferent Arteriolar Resistance",
    unit: "units",
    min: 0.5,
    max: 2.0,
    default: 1.0,
    step: 0.1,
    description: "Vasoconstriction of afferent arteriole (NSAIDs ↑)"
  },
  efferentResistance: {
    label: "Efferent Arteriolar Resistance",
    unit: "units",
    min: 0.5,
    max: 2.0,
    default: 1.0,
    step: 0.1,
    description: "Vasoconstriction of efferent arteriole (ACEi/ARB ↓)"
  },
  plasmaProteinConcentration: {
    label: "Plasma Protein",
    unit: "g/dL",
    min: 5,
    max: 9,
    default: 7,
    step: 0.5,
    description: "Affects oncotic pressure (opposes filtration)"
  },
  tubularReabsorption: {
    label: "Tubular Reabsorption",
    unit: "%",
    min: 95,
    max: 99.5,
    default: 99,
    step: 0.5,
    description: "Percentage of filtrate reabsorbed"
  }
};

interface OutputMetricProps {
  label: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  previousValue?: number;
}

const statusColors = {
  normal: 'bg-status-normal/10 border-status-normal/30 text-status-normal',
  warning: 'bg-status-warning/10 border-status-warning/30 text-status-warning',
  critical: 'bg-status-critical/10 border-status-critical/30 text-status-critical'
};

function OutputMetric({ label, value, unit, status, previousValue }: OutputMetricProps) {
  const trend = getTrend(value, previousValue);
  
  return (
    <div className={`p-3 rounded-lg border ${statusColors[status]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {previousValue !== undefined && (
          <TrendIndicator trend={trend} />
        )}
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-xl font-semibold">{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

export default function RenalModel() {
  const { trackSliderChange, trackTabChange, trackButtonClick, trackModelView } = useAnalytics('renal');
  
  const [params, setParams] = useState<RenalInputs>({
    meanArterialPressure: parameterDefinitions.meanArterialPressure.default,
    afferentResistance: parameterDefinitions.afferentResistance.default,
    efferentResistance: parameterDefinitions.efferentResistance.default,
    plasmaProteinConcentration: parameterDefinitions.plasmaProteinConcentration.default,
    tubularReabsorption: parameterDefinitions.tubularReabsorption.default
  });
  
  const [previousOutputs, setPreviousOutputs] = useState<RenalOutputs | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const animationRef = useRef<number | null>(null);
  
  // Track model view on mount
  useEffect(() => {
    trackModelView();
  }, [trackModelView]);
  
  // Calculate current hemodynamics
  const outputs = useMemo(() => 
    calculateRenalFunction(params),
    [params]
  );
  
  // Generate autoregulation curve data
  const curveData = useMemo(() => 
    generateAutoregulationCurve(params.afferentResistance, params.efferentResistance),
    [params.afferentResistance, params.efferentResistance]
  );
  
  const handleParamChange = useCallback((key: keyof RenalInputs, value: number) => {
    setPreviousOutputs(outputs);
    setParams(prev => ({ ...prev, [key]: value }));
    trackSliderChange(key, value);
  }, [outputs, trackSliderChange]);
  
  const resetParams = useCallback(() => {
    setPreviousOutputs(null);
    trackButtonClick('reset');
    setParams({
      meanArterialPressure: parameterDefinitions.meanArterialPressure.default,
      afferentResistance: parameterDefinitions.afferentResistance.default,
      efferentResistance: parameterDefinitions.efferentResistance.default,
      plasmaProteinConcentration: parameterDefinitions.plasmaProteinConcentration.default,
      tubularReabsorption: parameterDefinitions.tubularReabsorption.default
    });
  }, [trackButtonClick]);
  
  // Animate MAP changes to demonstrate autoregulation
  const toggleAnimation = useCallback(() => {
    if (isAnimating) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsAnimating(false);
      trackButtonClick('pause_animation');
    } else {
      setIsAnimating(true);
      trackButtonClick('start_animation');
      let direction = 1;
      let currentMap = params.meanArterialPressure;
      
      const animate = () => {
        currentMap += direction * 0.5;
        if (currentMap >= 160) direction = -1;
        if (currentMap <= 40) direction = 1;
        
        setParams(prev => ({ ...prev, meanArterialPressure: Math.round(currentMap) }));
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isAnimating, params.meanArterialPressure, trackButtonClick]);
  
  const handleTabChange = useCallback((tab: string) => {
    trackTabChange(tab);
  }, [trackTabChange]);
  
  // Cleanup animation on unmount
  React.useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  // Determine GFR status
  const getGFRStatusInfo = (gfr: number) => {
    if (gfr >= 90) return { label: 'Normal GFR', status: 'normal' as const };
    if (gfr >= 60) return { label: 'Mildly Reduced', status: 'warning' as const };
    if (gfr >= 30) return { label: 'Moderately Reduced', status: 'warning' as const };
    return { label: 'Severely Reduced', status: 'critical' as const };
  };
  
  const gfrStatus = getGFRStatusInfo(outputs.glomerularFiltrationRate);
  
  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAnimation}
          className="gap-2"
        >
          {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isAnimating ? 'Pause' : 'Animate MAP'}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={resetParams}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input Parameters */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-renal" />
              Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(parameterDefinitions).map(([key, def]) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{def.label}</span>
                  <span className="text-muted-foreground">
                    {params[key as keyof RenalInputs]} {def.unit}
                  </span>
                </div>
                <Slider
                  value={[params[key as keyof RenalInputs]]}
                  onValueChange={([value]) => handleParamChange(key as keyof RenalInputs, value)}
                  min={def.min}
                  max={def.max}
                  step={def.step}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">{def.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        
        {/* Outputs & Visualizations */}
        <Card className="lg:col-span-2">
          <Tabs defaultValue="overview" className="w-full" onValueChange={handleTabChange}>
            <CardHeader className="pb-0">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="curve">Autoreg Curve</TabsTrigger>
                <TabsTrigger value="diagram">Glomerulus</TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent className="pt-4">
              <TabsContent value="overview" className="mt-0 space-y-4">
                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant={gfrStatus.status === 'normal' ? 'default' : 'destructive'}>
                    {gfrStatus.label}
                  </Badge>
                  {outputs.warnings.length > 0 && (
                    <Badge variant="outline" className="border-status-warning text-status-warning">
                      {outputs.warnings.length} Warning{outputs.warnings.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                
                {/* Primary Outputs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <OutputMetric
                    label="GFR"
                    value={outputs.glomerularFiltrationRate}
                    unit="mL/min"
                    status={gfrStatus.status}
                    previousValue={previousOutputs?.glomerularFiltrationRate}
                  />
                  <OutputMetric
                    label="RBF"
                    value={outputs.renalBloodFlow}
                    unit="mL/min"
                    status={outputs.renalBloodFlow < 800 ? 'warning' : 'normal'}
                    previousValue={previousOutputs?.renalBloodFlow}
                  />
                  <OutputMetric
                    label="Filtration Fraction"
                    value={outputs.filtrationFraction}
                    unit="%"
                    status={outputs.filtrationFraction > 25 ? 'warning' : 'normal'}
                    previousValue={previousOutputs?.filtrationFraction}
                  />
                </div>
                
                {/* Advanced Metrics */}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      Advanced Metrics
                      {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <OutputMetric
                        label="Glomerular Pressure"
                        value={outputs.glomerularPressure}
                        unit="mmHg"
                        status={outputs.glomerularPressure < 45 ? 'warning' : 'normal'}
                        previousValue={previousOutputs?.glomerularPressure}
                      />
                      <OutputMetric
                        label="Net Filtration P"
                        value={outputs.netFiltrationPressure}
                        unit="mmHg"
                        status={outputs.netFiltrationPressure < 5 ? 'critical' : outputs.netFiltrationPressure < 10 ? 'warning' : 'normal'}
                        previousValue={previousOutputs?.netFiltrationPressure}
                      />
                      <OutputMetric
                        label="Urine Output"
                        value={outputs.urineOutput}
                        unit="mL/hr"
                        status={outputs.urineOutput < 30 ? 'warning' : 'normal'}
                        previousValue={previousOutputs?.urineOutput}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                
                {/* Clinical Pearl */}
                <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-start gap-2">
                    <Filter className="h-4 w-4 text-renal mt-0.5" />
                    <div className="text-sm">
                      <span className="font-medium">Clinical Interpretation: </span>
                      <span className="text-muted-foreground">
                        {getRenalInterpretation(outputs)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Warnings */}
                {outputs.warnings.length > 0 && (
                  <div className="p-3 rounded-lg bg-status-warning/10 border border-status-warning/30">
                    <ul className="text-sm text-status-warning space-y-1">
                      {outputs.warnings.map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="curve" className="mt-0">
                <AutoregulationChart
                  data={curveData}
                  currentMAP={params.meanArterialPressure}
                  currentRBF={outputs.renalBloodFlow}
                  currentGFR={outputs.glomerularFiltrationRate}
                />
              </TabsContent>
              
              <TabsContent value="diagram" className="mt-0">
                <GlomerularDiagram
                  afferentResistance={params.afferentResistance}
                  efferentResistance={params.efferentResistance}
                  glomerularPressure={outputs.glomerularPressure}
                  netFiltrationPressure={outputs.netFiltrationPressure}
                />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
