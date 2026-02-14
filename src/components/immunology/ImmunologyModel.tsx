import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Activity, Shield, Flame } from 'lucide-react';
import CytokineChart from './CytokineChart';
import CellInteractionDiagram from './CellInteractionDiagram';
import {
  simulateCytokineResponse,
  generateCytokineTimeline,
  getImmuneInterpretation,
  ImmuneInputs
} from '@/lib/physiology/immunology';
import { useAnalytics } from '@/hooks/useAnalytics';

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  description?: string;
  onChange: (value: number) => void;
}

const SliderControl: React.FC<SliderControlProps> = ({
  label, value, min, max, step, unit, description, onChange
}) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <span className="text-sm font-mono text-muted-foreground">
        {value} {unit}
      </span>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([v]) => onChange(v)}
      className="w-full"
    />
    {description && (
      <p className="text-xs text-muted-foreground">{description}</p>
    )}
  </div>
);

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  unit?: string;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, unit, color }) => (
  <div className={`p-4 rounded-lg border ${color}`}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-semibold">{value}</span>
      {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
    </div>
  </div>
);

const ImmunologyModel: React.FC = () => {
  const { trackSliderChange, trackModelView } = useAnalytics('immunology');
  
  const [inputs, setInputs] = useState<ImmuneInputs>({
    pathogenLoad: 50,
    macrophageActivity: 70,
    tCellCount: 1000,
    time: 12
  });

  // Track model view on mount
  useEffect(() => {
    trackModelView();
  }, [trackModelView]);

  const outputs = useMemo(() => simulateCytokineResponse(inputs), [inputs]);
  
  const timeline = useMemo(() => 
    generateCytokineTimeline(inputs.pathogenLoad, inputs.macrophageActivity, inputs.tCellCount),
    [inputs.pathogenLoad, inputs.macrophageActivity, inputs.tCellCount]
  );

  const interpretation = useMemo(() => getImmuneInterpretation(outputs), [outputs]);

  const updateInput = useCallback(<K extends keyof ImmuneInputs>(key: K, value: ImmuneInputs[K]) => {
    setInputs(prev => ({ ...prev, [key]: value }));
    trackSliderChange(key, value as number);
  }, [trackSliderChange]);

  const getResponseColor = () => {
    switch (outputs.immuneResponse) {
      case 'insufficient': return 'bg-status-warning/10 text-status-warning border-status-warning/30';
      case 'excessive': return 'bg-status-critical/10 text-status-critical border-status-critical/30';
      default: return 'bg-status-normal/10 text-status-normal border-status-normal/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Immune Scenario Parameters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SliderControl
            label="Pathogen Load"
            value={inputs.pathogenLoad}
            min={0}
            max={100}
            step={5}
            unit="units"
            description="Severity of infection"
            onChange={(v) => updateInput('pathogenLoad', v)}
          />
          <SliderControl
            label="Macrophage Activity"
            value={inputs.macrophageActivity}
            min={10}
            max={100}
            step={5}
            unit="%"
            description="Innate immune activation"
            onChange={(v) => updateInput('macrophageActivity', v)}
          />
          <SliderControl
            label="T Cell Count"
            value={inputs.tCellCount}
            min={200}
            max={2000}
            step={50}
            unit="cells/μL"
            description="Adaptive immune capacity"
            onChange={(v) => updateInput('tCellCount', v)}
          />
          <SliderControl
            label="Time Post-Infection"
            value={inputs.time}
            min={0}
            max={72}
            step={2}
            unit="hours"
            description="Phase of immune response"
            onChange={(v) => updateInput('time', v)}
          />
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<Flame className="w-4 h-4 text-status-critical" />}
          label="Inflammation Index"
          value={outputs.inflammationIndex}
          unit="/100"
          color={outputs.inflammationIndex > 60 ? 'bg-status-critical/10 border-status-critical/30' : 'bg-card border-border'}
        />
        <MetricCard
          icon={<Activity className="w-4 h-4 text-primary" />}
          label="Immune Response"
          value={outputs.immuneResponse.charAt(0).toUpperCase() + outputs.immuneResponse.slice(1)}
          color={getResponseColor()}
        />
        <MetricCard
          icon={<Shield className="w-4 h-4 text-status-normal" />}
          label="Phase"
          value={outputs.phase.charAt(0).toUpperCase() + outputs.phase.slice(1)}
          color="bg-card border-border"
        />
        <MetricCard
          icon={<AlertTriangle className="w-4 h-4 text-status-warning" />}
          label="Tissue Damage Risk"
          value={outputs.tissuesDamageRisk}
          unit="%"
          color={outputs.tissuesDamageRisk > 50 ? 'bg-status-warning/10 border-status-warning/30' : 'bg-card border-border'}
        />
      </div>

      {/* Cytokine Levels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Cytokine Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-status-critical/10 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">TNF-α</p>
              <p className="text-xl font-semibold text-status-critical">{outputs.cytokines.tnfAlpha}</p>
              <p className="text-xs text-muted-foreground">pg/mL</p>
            </div>
            <div className="text-center p-3 bg-status-warning/10 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">IL-1</p>
              <p className="text-xl font-semibold text-status-warning">{outputs.cytokines.il1}</p>
              <p className="text-xs text-muted-foreground">pg/mL</p>
            </div>
            <div className="text-center p-3 bg-primary/10 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">IL-6</p>
              <p className="text-xl font-semibold text-primary">{outputs.cytokines.il6}</p>
              <p className="text-xs text-muted-foreground">pg/mL</p>
            </div>
            <div className="text-center p-3 bg-status-normal/10 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">IL-10</p>
              <p className="text-xl font-semibold text-status-normal">{outputs.cytokines.il10}</p>
              <p className="text-xs text-muted-foreground">pg/mL</p>
            </div>
            <div className="text-center p-3 bg-immunology/10 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">IFN-γ</p>
              <p className="text-xl font-semibold text-immunology">{outputs.cytokines.interferonGamma}</p>
              <p className="text-xs text-muted-foreground">pg/mL</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CytokineChart data={timeline} currentTime={inputs.time} />
        <CellInteractionDiagram
          cytokines={outputs.cytokines}
          phase={outputs.phase}
          macrophageActivity={inputs.macrophageActivity}
          tCellCount={inputs.tCellCount}
        />
      </div>

      {/* SIRS Alert */}
      {outputs.sirsRisk && (
        <Card className="border-status-critical/50 bg-status-critical/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-status-critical shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-status-critical">Cytokine Storm Risk</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Elevated pro-inflammatory cytokines suggest risk of systemic inflammatory response syndrome (SIRS). 
                  Consider immunomodulatory interventions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {outputs.warnings.length > 0 && !outputs.sirsRisk && (
        <Card className="border-status-warning/50 bg-status-warning/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />
              <div className="space-y-1">
                {outputs.warnings.map((warning, i) => (
                  <p key={i} className="text-sm text-status-warning">{warning}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clinical Interpretation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Clinical Interpretation</CardTitle>
            <Badge variant={outputs.status === 'normal' ? 'default' : outputs.status === 'warning' ? 'secondary' : 'destructive'}>
              {outputs.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{interpretation}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImmunologyModel;
