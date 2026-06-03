import { Layout } from "@/components/layout/Layout";
import { Scale, AlertTriangle, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const TermsOfService = () => {
  return (
    <Layout>
      <div className="container py-12 sm:py-16 max-w-4xl">
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Scale className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">
            Terms of Service & Medical Disclaimer
          </h1>
          <p className="text-muted-foreground">
            Last Updated: June 2026
          </p>
        </div>

        <div className="space-y-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Not Medical Advice
              </CardTitle>
            </CardHeader>
            <CardContent className="text-red-900/80 dark:text-red-200/80 leading-relaxed text-sm">
              <p className="mb-4">
                The content, tools, simulations, and literature search capabilities provided by Medinex (the "Platform") are for <strong>educational and informational purposes only</strong>. 
              </p>
              <p>
                Medinex is <strong>NOT</strong> an AI diagnostic tool, a medical device, or a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of a qualified healthcare provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of information accessed through this Platform.
              </p>
            </CardContent>
          </Card>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" /> 1. Acceptance of Terms
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              By accessing or using the Medinex Biomedical Intelligence Operating System, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Platform.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" /> 2. Third-Party Data Sources
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Our Platform utilizes external application programming interfaces (APIs), including but not limited to PubMed (NCBI E-utilities) and ClinicalTrials.gov, to fetch live biomedical literature and dataset information. 
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
              <li>We do not control, endorse, or guarantee the accuracy, completeness, or reliability of any third-party data displayed.</li>
              <li>Your use of literature and datasets is subject to the respective terms and policies of the original providers (e.g., the National Library of Medicine).</li>
              <li>Medinex is not responsible for errors, omissions, or algorithmic biases present in external scientific literature or trial registries.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> 3. Interactive Simulations
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Physiological simulations (such as the Cardiovascular, Renal, and Immunology models) are simplified mathematical approximations of human biology. They are designed to demonstrate general principles of systemic interaction (e.g., the Guyton and Hall physiological models) and do not represent the exact physiological responses of any individual patient. They must not be used to guide clinical interventions or dosage calculations.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" /> 4. Limitation of Liability
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              In no event shall Medinex, its founders, developers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Platform.
            </p>
          </section>
          
        </div>
      </div>
    </Layout>
  );
};

// Simple icon fallbacks since we didn't import all from lucide-react above
function Database(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
}
function Activity(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
}

export default TermsOfService;
