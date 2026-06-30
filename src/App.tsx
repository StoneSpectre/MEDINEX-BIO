import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Cardiovascular from "./pages/Cardiovascular";
import Renal from "./pages/Renal";
import Immunology from "./pages/Immunology";
import Nervous from "./pages/Nervous";
import Reproductive from "./pages/Reproductive";
import SystemThinking from "./pages/SystemThinking";
import Ophthalmology from "./pages/Ophthalmology";
import ENT from "./pages/ENT";
import Hepatic from "./pages/Hepatic";
import Respiratory from "./pages/Respiratory";
import Endocrine from "./pages/Endocrine";
import About from "./pages/About";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import TermsOfService from "./pages/TermsOfService";

import { KnowledgeGraph } from "./pages/KnowledgeGraph";
import { Analytics } from "./pages/Analytics";
import BioquoraDashboard from "./pages/BioquoraPhase";
import Assistant from "./pages/Assistant";
import ExplorerSelector from "./pages/ExplorerSelector";
import ExplorerV1 from "./pages/ExplorerV1";
import ExplorerV2 from "./pages/ExplorerV2";
import NotFound from "./pages/NotFound";
import DiagnosticDashboard from "./pages/DiagnosticDashboard";
import Steps67 from "./pages/Steps67";
import Phase4 from "./pages/Phase4";
import Phase5 from "./pages/Phase5";
import GraphRAGDemo from "./pages/GraphRAGDemo";
import BioquoraCopilotDAG from "./components/bioquora-copilot-dag";
import PredictiveML from "./pages/PredictiveML";
import RecommendationEngine from "./pages/RecommendationEngine";

import Workspace from "./pages/Workspace";
import ResearchCopilot from "./pages/ResearchCopilot";

import BioquoraExplorer from "./components/BioquoraExplorer";
import RecommendationOnboarding from "./components/RecommendationOnboarding";
import RecommendationPhase2 from "./components/RecommendationPhase2";
import FoundationDashboard from "./pages/FoundationDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/cardiovascular" element={<Cardiovascular />} />
            <Route path="/renal" element={<Renal />} />
            <Route path="/immunology" element={<Immunology />} />
            <Route path="/nervous" element={<Nervous />} />
            <Route path="/reproductive" element={<Reproductive />} />
            <Route path="/system-thinking" element={<SystemThinking />} />
            <Route path="/ophthalmology" element={<Ophthalmology />} />
            <Route path="/ent" element={<ENT />} />
            <Route path="/hepatic" element={<Hepatic />} />
            <Route path="/respiratory" element={<Respiratory />} />
            <Route path="/endocrine" element={<Endocrine />} />
            <Route path="/about" element={<About />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/roadmap" element={<BioquoraDashboard />} />
            <Route path="/knowledge-graph" element={<KnowledgeGraph />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/explorer" element={<ExplorerSelector />} />
            <Route path="/diagnostic" element={<DiagnosticDashboard />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/explorer-v1" element={<ExplorerV1 />} />
            <Route path="/explorer-v2" element={<ExplorerV2 />} />
            <Route path="/steps-6-7" element={<Steps67 />} />
            <Route path="/phase4" element={<Phase4 />} />
            <Route path="/phase5" element={<Phase5 />} />
            <Route path="/predictive-ml" element={<PredictiveML />} />
            <Route path="/recommendation-engine" element={<RecommendationEngine />} />
            <Route path="/copilot" element={<ResearchCopilot />} />
            <Route path="/bioquora-explorer" element={<BioquoraExplorer />} />
            <Route path="/recommendations" element={<RecommendationOnboarding />} />
            <Route path="/recommendations/phase2" element={<RecommendationPhase2 />} />
            <Route path="/graphrag-demo" element={<GraphRAGDemo />} />
            <Route path="/copilot-dag" element={<BioquoraCopilotDAG />} />
            <Route path="/foundation" element={<FoundationDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
