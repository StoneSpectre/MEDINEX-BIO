import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { CredibilityStrip } from "@/components/home/CredibilityStrip";
import { ModulesSection } from "@/components/home/ModulesSection";


const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <CredibilityStrip />

      <ModulesSection />
    </Layout>
  );
};

export default Index;
