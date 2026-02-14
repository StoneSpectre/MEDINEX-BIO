import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { CredibilityStrip } from "@/components/home/CredibilityStrip";
import { ModulesSection } from "@/components/home/ModulesSection";
import { ProgressTracker } from "@/components/home/ProgressTracker";
import { CompletionCertificate } from "@/components/home/CompletionCertificate";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <CredibilityStrip />
      <div className="container mb-8 space-y-4">
        <CompletionCertificate />
        <ProgressTracker />
      </div>
      <ModulesSection />
    </Layout>
  );
};

export default Index;
