import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Brain } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CardiorenalSyndrome from "@/components/systems/essays/CardiorenalSyndrome";
import SepsisPhysiology from "@/components/systems/essays/SepsisPhysiology";
import AcidBaseIntegration from "@/components/systems/essays/AcidBaseIntegration";
import { useProgressTracking } from "@/hooks/useProgressTracking";

const SystemThinking = () => {
  const { markModuleVisited } = useProgressTracking();

  useEffect(() => {
    markModuleVisited('systemThinking');
  }, [markModuleVisited]);

  return (
    <Layout>
      <div className="container py-8 sm:py-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-systems/10">
            <Brain className="h-5 w-5 text-systems" />
          </div>
          <h1 className="text-2xl sm:text-3xl">ICU Systems Thinking</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl mb-8">
          Essays on clinical reasoning and why systems-level thinking matters.
        </p>
        
        <Tabs defaultValue="cardiorenal" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="cardiorenal">Cardiorenal Syndrome</TabsTrigger>
            <TabsTrigger value="sepsis">Sepsis Physiology</TabsTrigger>
            <TabsTrigger value="acidbase">Acid-Base Integration</TabsTrigger>
          </TabsList>
          
          <TabsContent value="cardiorenal">
            <CardiorenalSyndrome />
          </TabsContent>
          
          <TabsContent value="sepsis">
            <SepsisPhysiology />
          </TabsContent>
          
          <TabsContent value="acidbase">
            <AcidBaseIntegration />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SystemThinking;
