import { Link, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Heart, Droplet, Shield, Brain, Menu, X, Settings, Network, Activity, Layers, Sparkles, ChevronDown, BookOpen, Compass, LineChart, Stethoscope, Bot, Microscope, Database, PersonStanding, Workflow } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import EarlyAccessModal from "@/components/common/EarlyAccessModal";
import bioquoraLogo from "@/assets/bioquora-logo.png";
import { Waves, Wind, ActivitySquare, Zap, Baby, Eye, Ear } from "lucide-react";

const topicItems = [
  { path: "/cardiovascular", label: "Cardiovascular", icon: Heart, color: "text-cardio" },
  { path: "/renal", label: "Renal", icon: Droplet, color: "text-renal" },
  { path: "/immunology", label: "Immunology", icon: Shield, color: "text-immune" },
  { path: "/nervous", label: "Nervous System", icon: Zap, color: "text-purple-500" },
  { path: "/reproductive", label: "Reproductive", icon: Baby, color: "text-pink-500" },
  { path: "/system-thinking", label: "System Thinking", icon: Brain, color: "text-systems" },
  { path: "/hepatic", label: "Hepatic", icon: Waves, color: "text-orange-500" },
  { path: "/respiratory", label: "Respiratory", icon: Wind, color: "text-blue-500" },
  { path: "/endocrine", label: "Endocrine", icon: ActivitySquare, color: "text-yellow-500" },
  { path: "/ophthalmology", label: "Ophthalmology", icon: Eye, color: "text-sky-500" },
  { path: "/ent", label: "ENT", icon: Ear, color: "text-orange-500" },
];

const featureItems = [
  { path: "/knowledge-graph", label: "Knowledge Graph", icon: Network, color: "text-blue-500" },
  { path: "/analytics", label: "Analytics", icon: LineChart, color: "text-indigo-500" },
  { path: "/assistant", label: "Assistant", icon: Bot, color: "text-fuchsia-400" },
  { path: "/copilot", label: "Research Copilot", icon: Microscope, color: "text-emerald-500" },
  { path: "/explorer", label: "Explorer", icon: Compass, color: "text-teal-500" },
  { path: "/diagnostic", label: "Diagnostics", icon: Stethoscope, color: "text-rose-500" },
  { path: "/recommendations", label: "Recommendations", icon: Sparkles, color: "text-amber-500" },
  { path: "/foundation", label: "Foundation (Neo4j)", icon: Database, color: "text-sky-500" },
  { path: "/predictive-ml", label: "Predictive ML", icon: Activity, color: "text-red-500" },
  { path: "/phase4", label: "Phase 4 (Agents)", icon: Bot, color: "text-cyan-500" },
  { path: "/phase5", label: "Phase 5 (Digital Twin)", icon: PersonStanding, color: "text-emerald-500" },
  { path: "/recommendation-engine", label: "Neural Recommendations", icon: Sparkles, color: "text-amber-400" },
  { path: "/copilot-dag", label: "Copilot DAG Trace", icon: Workflow, color: "text-purple-500" },
];

const mainItems = [
  { path: "/workspace", label: "Workspace", icon: BookOpen, color: "text-emerald-500" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-sm transition-all">
      <div className="container flex h-16 items-center justify-between">
      <Link to="/" className="flex items-center gap-3">
          <img src={bioquoraLogo} alt="BIOQUORA" className="h-10 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 transition-colors">
                <Layers className="h-4 w-4" />
                <span className="hidden lg:inline">Topics</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-background/95 backdrop-blur-md border-border/50">
              {topicItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.path} asChild className="cursor-pointer">
                    <Link to={item.path} className="flex items-center gap-3 w-full py-2">
                      <Icon className={cn("h-4 w-4", item.color)} />
                      <span>{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 transition-colors">
                <Settings className="h-4 w-4" />
                <span className="hidden lg:inline">Tools</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-background/95 backdrop-blur-md border-border/50">
              {featureItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.path} asChild className="cursor-pointer">
                    <Link to={item.path} className="flex items-center gap-3 w-full py-2">
                      <Icon className={cn("h-4 w-4", item.color)} />
                      <span>{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {mainItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2 transition-colors",
                    isActive && "bg-accent"
                  )}
                >
                  <Icon className={cn("h-4 w-4", item.color)} />
                  <span className="hidden lg:inline">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link to="/admin" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden lg:inline">Admin</span>
              </Button>
            </Link>
          )}
          <Link to="/roadmap" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              Phase Tracker
            </Button>
          </Link>

          <Link to="/about" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              About
            </Button>
          </Link>
          <EarlyAccessModal
            trigger={
              <Button size="sm" className="hidden sm:flex">
                Join Early Access
              </Button>
            }
          />
          
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-border md:hidden">
          <nav className="container flex flex-col gap-1 py-4">
            <div className="flex flex-col gap-1 pb-2 border-b border-border/30">
              <span className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 mt-2">Main</span>
              {mainItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3 pl-6"
                    >
                      <Icon className={cn("h-5 w-5", item.color)} />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-col gap-1 pb-2 border-b border-border/30">
              <span className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 mt-2">Topics</span>
              {topicItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3 pl-6"
                    >
                      <Icon className={cn("h-5 w-5", item.color)} />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
            
            <div className="flex flex-col gap-1 pb-2 border-b border-border/30">
              <span className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 mt-2">Tools</span>
              {featureItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3 pl-6"
                    >
                      <Icon className={cn("h-5 w-5", item.color)} />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
            
            <div className="flex flex-col gap-1 pt-2">
              {mainItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3"
                    >
                      <Icon className={cn("h-5 w-5", item.color)} />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              {isAdmin && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <Settings className="h-5 w-5" />
                    Admin Dashboard
                  </Button>
                </Link>
              )}
              <Link to="/roadmap" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  Phase Tracker
                </Button>
              </Link>

              <Link to="/about" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  About
                </Button>
              </Link>
              <EarlyAccessModal
                trigger={
                  <Button className="w-full">Join Early Access</Button>
                }
              />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
