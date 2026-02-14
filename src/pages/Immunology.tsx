import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Shield } from "lucide-react";
import ImmunologyModel from "@/components/immunology/ImmunologyModel";
import { useProgressTracking } from "@/hooks/useProgressTracking";

const Immunology = () => {
  const { markModuleVisited } = useProgressTracking();

  useEffect(() => {
    markModuleVisited('immunology');
  }, [markModuleVisited]);

  return (
    <Layout>
      <div className="container py-8 sm:py-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-immune/10">
            <Shield className="h-5 w-5 text-immune" />
          </div>
          <h1 className="text-2xl sm:text-3xl">Immunology & Inflammation</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl mb-8">
          Cytokine cascades, immune-vascular coupling, and sepsis as coupled control failure.
        </p>
        <ImmunologyModel />
      </div>
    </Layout>
  );
};

export default Immunology;
