import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Droplet, Shield, Brain, Menu, X, Settings } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import EarlyAccessModal from "@/components/common/EarlyAccessModal";
import medinexLogo from "@/assets/medinex-logo.png";
const navItems = [
  { path: "/cardiovascular", label: "Cardiovascular", icon: Heart, color: "text-cardio" },
  { path: "/renal", label: "Renal", icon: Droplet, color: "text-renal" },
  { path: "/immunology", label: "Immunology", icon: Shield, color: "text-immune" },
  { path: "/system-thinking", label: "System Thinking", icon: Brain, color: "text-systems" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
      <Link to="/" className="flex items-center gap-3">
          <img src={medinexLogo} alt="MEDINEX" className="h-10 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
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
            {navItems.map((item) => {
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
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              {isAdmin && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <Settings className="h-5 w-5" />
                    Admin Dashboard
                  </Button>
                </Link>
              )}
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
