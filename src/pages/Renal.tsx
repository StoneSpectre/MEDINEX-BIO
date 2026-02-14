import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Droplet } from "lucide-react";
import RenalModel from "@/components/renal/RenalModel";
import { useProgressTracking } from "@/hooks/useProgressTracking";

const Renal = () => {
  const { markModuleVisited } = useProgressTracking();

  useEffect(() => {
    markModuleVisited('renal');
  }, [markModuleVisited]);

  return (
    <Layout>
      <div className="container py-8 sm:py-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-renal/10">
            <Droplet className="h-5 w-5 text-renal" />
          </div>
          <h1 className="text-2xl sm:text-3xl">Renal Physiology</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl mb-8">
          Explore autoregulation, MAP vs GFR relationships, and why creatinine is a lagging marker.
        </p>
        <RenalModel />
      </div>
    </Layout>
  );
};

export default Renal;
