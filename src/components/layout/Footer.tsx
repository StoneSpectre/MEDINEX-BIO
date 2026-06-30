import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import bioquoraLogo from "@/assets/bioquora-logo.png";
export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-muted/30">
      <div className="container pt-16 pb-12">
        <div className="grid gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
             <img src={bioquoraLogo} alt="BIOQUORA" className="h-10 w-auto" /> 
            </div>
            <p className="text-sm text-muted-foreground">
              Understanding human physiology the way critical care decisions demand.
            </p>
          </div>

          {/* Modules */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Modules</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/cardiovascular" className="hover:text-foreground transition-colors">
                Cardiovascular
              </Link>
              <Link to="/renal" className="hover:text-foreground transition-colors">
                Renal
              </Link>
              <Link to="/immunology" className="hover:text-foreground transition-colors">
                Immunology
              </Link>
              <Link to="/system-thinking" className="hover:text-foreground transition-colors">
                System Thinking
              </Link>
            </nav>
          </div>

          {/* Tools */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Tools</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/knowledge-graph" className="hover:text-foreground transition-colors">Knowledge Graph</Link>
              <Link to="/foundation" className="hover:text-foreground transition-colors pl-4 border-l border-border/50">↳ Foundation Models</Link>
              <Link to="/diagnostic" className="hover:text-foreground transition-colors mt-1">Diagnostics</Link>
              <Link to="/predictive-ml" className="hover:text-foreground transition-colors pl-4 border-l border-border/50">↳ Predictive ML</Link>
              <Link to="/phase5" className="hover:text-foreground transition-colors pl-4 border-l border-border/50">↳ Digital Twin</Link>
              <Link to="/copilot" className="hover:text-foreground transition-colors mt-1">Research Copilot</Link>
              <Link to="/phase4" className="hover:text-foreground transition-colors pl-4 border-l border-border/50">↳ Agentic Pipeline</Link>
              <Link to="/copilot-dag" className="hover:text-foreground transition-colors pl-4 border-l border-border/50">↳ DAG Trace</Link>
              <Link to="/recommendations" className="hover:text-foreground transition-colors mt-1">Recommendations</Link>
              <Link to="/recommendation-engine" className="hover:text-foreground transition-colors pl-4 border-l border-border/50">↳ Neural Engine</Link>
            </nav>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Resources</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-foreground transition-colors">
                About
              </Link>
              <a href="#" className="hover:text-foreground transition-colors">
                Documentation
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Contact
              </a>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Legal</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <Link to="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
            </nav>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Disclaimer */}
        <div className="space-y-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>Educational platform</span>
            <span className="opacity-50">•</span>
            <span>Not a medical device</span>
            <span className="opacity-50">•</span>
            <span>No patient data</span>
            <span className="opacity-50">•</span>
            <span>Not for clinical use</span>
          </div>
          <div>
            <span>Primary References: Multi-Source Synthesized Knowledge Base (Robbins Pathology, Guyton Physiology, Clinical Data)</span>
          </div>
          <p className="pt-2">
            © {new Date().getFullYear()} BIOQUORA. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
