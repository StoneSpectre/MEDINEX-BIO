import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { HemodynamicModel } from "@/components/cardiovascular/HemodynamicModel";
import { Heart, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useProgressTracking } from "@/hooks/useProgressTracking";

const Cardiovascular = () => {
  const { markModuleVisited } = useProgressTracking();

  useEffect(() => {
    markModuleVisited('cardiovascular');
  }, [markModuleVisited]);

  return (
    <Layout>
      <div className="container py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cardio/10">
              <Heart className="h-5 w-5 text-cardio" />
            </div>
            <h1 className="text-2xl sm:text-3xl">Cardiovascular Physiology</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Interactive hemodynamic modeling based on real physiological relationships. 
            Explore how preload, afterload, heart rate, and contractility interact to 
            determine cardiac output and tissue oxygen delivery.
          </p>
        </div>

        {/* Info Card */}
        <Card className="mb-8 p-4 bg-accent/30 border-accent">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">How to use this model</p>
              <p className="text-sm text-muted-foreground">
                Adjust the sliders to change hemodynamic parameters. Watch how the 
                Frank-Starling curve shifts and how MAP, cardiac output, and oxygen 
                delivery respond. The clinical interpretation updates in real-time.
              </p>
            </div>
          </div>
        </Card>

        {/* Interactive Model */}
        <HemodynamicModel />

        {/* Key Concepts */}
        <section className="mt-12 pt-12 border-t border-border">
          <h2 className="text-xl font-medium mb-6">Key Physiological Concepts</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="p-5">
              <h3 className="font-medium mb-2">Frank-Starling Mechanism</h3>
              <p className="text-sm text-muted-foreground">
                The heart's intrinsic ability to change its force of contraction 
                in response to changes in venous return. More stretch = more force.
              </p>
            </Card>
            <Card className="p-5">
              <h3 className="font-medium mb-2">Afterload</h3>
              <p className="text-sm text-muted-foreground">
                The resistance the heart must overcome to eject blood. Higher SVR 
                increases afterload and reduces stroke volume.
              </p>
            </Card>
            <Card className="p-5">
              <h3 className="font-medium mb-2">Oxygen Delivery (DO₂)</h3>
              <p className="text-sm text-muted-foreground">
                DO₂ = CO × CaO₂. The amount of oxygen delivered to tissues per 
                minute, dependent on cardiac output and blood oxygen content.
              </p>
            </Card>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Cardiovascular;
