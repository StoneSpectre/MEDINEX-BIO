import { ReactNode } from "react";
import { WorkspaceSidebar } from "./WorkspaceSidebar";

interface WorkspaceLayoutProps {
  projectId: string;
  children: ReactNode;
}

export function WorkspaceLayout({ projectId, children }: WorkspaceLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      <WorkspaceSidebar projectId={projectId} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
