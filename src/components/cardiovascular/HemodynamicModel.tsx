import { useState, useMemo, useCallback, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  HemodynamicInputs,
  calculateHemodynamics,
  generateFrankStarlingCurve,
  getValueStatus,
} from "@/lib/physiology/hemodynamics";
import { FrankStarlingChart } from "./FrankStarlingChart";
import { TrendIndicator } from "./TrendIndicator";
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  description?: string;
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  description,
}: SliderControlProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Badge variant="secondary" className="font-mono">
          {value} {unit}
        </Badge>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="cursor-pointer"
      />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

interface OutputMetricProps {
  label: string;
  value: number | string;
  unit: string;
  status?: 'normal' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
}

function OutputMetric({ label, value, unit, status = 'normal', trend }: OutputMetricProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        {trend && <TrendIndicator trend={trend} />}
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "text-2xl font-light tabular-nums",
            status === 'normal' && "text-status-normal",
            status === 'warning' && "text-status-warning",
            status === 'critical' && "text-status-critical"
          )}
        >
          {value}
        </span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

export function HemodynamicModel() {
  const { trackSliderChange, trackModelView } = useAnalytics('cardiovascular');
  
  const [inputs, setInputs] = useState<HemodynamicInputs>({
    preload: 12,
    svr: 1200,
    heartRate: 75,
    contractility: 1.0,
  });

  const [prevOutputs, setPrevOutputs] = useState<ReturnType<typeof calculateHemodynamics> | null>(null);

  // Track model view on mount
  useEffect(() => {
    trackModelView();
  }, [trackModelView]);

  const outputs = useMemo(() => {
    const result = calculateHemodynamics(inputs);
    return result;
  }, [inputs]);

  const frankStarlingData = useMemo(() => {
    return generateFrankStarlingCurve(inputs.contractility, inputs.svr);
  }, [inputs.contractility, inputs.svr]);

  const updateInput = useCallback(
    <K extends keyof HemodynamicInputs>(key: K, value: HemodynamicInputs[K]) => {
      setPrevOutputs(outputs);
      setInputs((prev) => ({ ...prev, [key]: value }));
      trackSliderChange(key, value as number);
    },
    [outputs, trackSliderChange]
  );

  const getTrend = (current: number, prev: number | undefined): 'up' | 'down' | 'stable' => {
    if (prev === undefined) return 'stable';
    const diff = current - prev;
    if (Math.abs(diff) < 0.5) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  return (
    <div className="space-y-8">
      {/* Controls */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-6">Hemodynamic Controls</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <SliderControl
            label="Preload (LVEDP)"
            value={inputs.preload}
            min={0}
            max={30}
            step={1}
            unit="mmHg"
            onChange={(v) => updateInput("preload", v)}
            description="Left ventricular end-diastolic pressure"
          />
          <SliderControl
            label="SVR"
            value={inputs.svr}
            min={500}
            max={2500}
            step={50}
            unit="dynes"
            onChange={(v) => updateInput("svr", v)}
            description="Systemic vascular resistance"
          />
          <SliderControl
            label="Heart Rate"
            value={inputs.heartRate}
            min={40}
            max={180}
            step={5}
            unit="bpm"
            onChange={(v) => updateInput("heartRate", v)}
            description="Beats per minute"
          />
          <SliderControl
            label="Contractility"
            value={inputs.contractility}
            min={0.5}
            max={2.0}
            step={0.1}
            unit="×"
            onChange={(v) => updateInput("contractility", v)}
            description="Myocardial contractile force multiplier"
          />
        </div>
      </Card>

      {/* Outputs Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OutputMetric
          label="Mean Arterial Pressure"
          value={outputs.map}
          unit="mmHg"
          status={getValueStatus('map', outputs.map)}
          trend={getTrend(outputs.map, prevOutputs?.map)}
        />
        <OutputMetric
          label="Cardiac Output"
          value={outputs.cardiacOutput}
          unit="L/min"
          status={getValueStatus('co', outputs.cardiacOutput)}
          trend={getTrend(outputs.cardiacOutput, prevOutputs?.cardiacOutput)}
        />
        <OutputMetric
          label="Stroke Volume"
          value={outputs.strokeVolume}
          unit="mL"
          trend={getTrend(outputs.strokeVolume, prevOutputs?.strokeVolume)}
        />
        <OutputMetric
          label="O₂ Delivery"
          value={outputs.oxygenDelivery}
          unit="mL/min"
          status={getValueStatus('do2', outputs.oxygenDelivery)}
          trend={getTrend(outputs.oxygenDelivery, prevOutputs?.oxygenDelivery)}
        />
      </div>

      {/* Frank-Starling Curve */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Frank-Starling Curve</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Stroke volume response to changes in preload. The current operating point is highlighted.
        </p>
        <FrankStarlingChart
          data={frankStarlingData}
          currentPreload={inputs.preload}
          currentSV={outputs.strokeVolume}
        />
      </Card>

      {/* Warnings */}
      {outputs.warnings.length > 0 && (
        <Card className="border-status-warning/50 bg-status-warning/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-status-warning shrink-0 mt-0.5" />
            <div className="space-y-1">
              {outputs.warnings.map((warning, index) => (
                <p key={index} className="text-sm text-foreground">
                  {warning}
                </p>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Interpretation */}
      <Card className="p-6 bg-accent/50">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Clinical Interpretation
        </h4>
        <p className="text-foreground leading-relaxed">
          {outputs.interpretation}
        </p>
      </Card>
    </div>
  );
}
