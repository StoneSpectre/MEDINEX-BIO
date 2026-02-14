import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import medinexLogo from "@/assets/medinex-logo.png";
export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
             <img src={medinexLogo} alt="MEDINEX" className="h-10 w-auto" /> 
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
              <a href="#" className="hover:text-foreground transition-colors">
                Terms of Service
              </a>
            </nav>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Disclaimer */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span>Educational platform</span>
            <span>•</span>
            <span>Not a medical device</span>
            <span>•</span>
            <span>No patient data</span>
            <span>•</span>
            <span>Not for clinical use</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} MEDINEX. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
