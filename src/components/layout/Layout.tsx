import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import FeedbackWidget from "@/components/common/FeedbackWidget";

interface LayoutProps {
  children: ReactNode;
}

const getModuleFromPath = (pathname: string): string => {
  const pathMap: Record<string, string> = {
    '/': 'home',
    '/cardiovascular': 'cardiovascular',
    '/renal': 'renal',
    '/immunology': 'immunology',
    '/systems': 'systems',
    '/about': 'about',
  };
  return pathMap[pathname] || 'general';
};

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const currentModule = getModuleFromPath(location.pathname);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      
      {/* Floating feedback widget */}
      <div className="fixed bottom-6 right-6 z-50">
        <FeedbackWidget module={currentModule} />
      </div>
    </div>
  );
}
