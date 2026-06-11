import { useQuery } from "@tanstack/react-query";
import { workspaceApi } from "@/lib/api/workspace";
import { Folder, FolderOpen, FileText, Library, Tag, Plus, PlusCircle, BrainCircuit, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface WorkspaceSidebarProps {
  projectId: string;
  activeView: string;
  setActiveView: (view: string) => void;
}

export function WorkspaceSidebar({ projectId, activeView, setActiveView }: WorkspaceSidebarProps) {
  const { data: collections, isLoading: loadingCollections } = useQuery({
    queryKey: ['collections', projectId],
    queryFn: () => workspaceApi.getCollections(projectId),
    enabled: !!projectId
  });

  const { data: folders, isLoading: loadingFolders } = useQuery({
    queryKey: ['folders', projectId],
    queryFn: () => workspaceApi.getFolders(projectId),
    enabled: !!projectId
  });

  return (
    <div className="w-64 border-r border-border/50 bg-background flex flex-col h-full shrink-0 shadow-sm">
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">WORKSPACE</h2>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <PlusCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      <Separator />
      
      <ScrollArea className="flex-1 px-2 py-4">
        {/* Core Views */}
        <div className="mb-6 space-y-1">
          <Button 
            variant={activeView === "papers" ? "secondary" : "ghost"} 
            onClick={() => setActiveView("papers")}
            className={cn("w-full justify-start h-8 px-2 text-sm font-normal", activeView !== "papers" && "text-muted-foreground")}
          >
            <FileText className="mr-2 h-4 w-4" />
            All Saved Papers
          </Button>
          <Button 
            variant={activeView === "notes" ? "secondary" : "ghost"} 
            onClick={() => setActiveView("notes")}
            className={cn("w-full justify-start h-8 px-2 text-sm font-normal", activeView !== "notes" && "text-muted-foreground")}
          >
            <Tag className="mr-2 h-4 w-4" />
            Research Notes
          </Button>
          <Button 
            variant={activeView === "ai_review" ? "secondary" : "ghost"} 
            onClick={() => setActiveView("ai_review")}
            className={cn("w-full justify-start h-8 px-2 text-sm font-normal", activeView !== "ai_review" && "text-muted-foreground")}
          >
            <BrainCircuit className="mr-2 h-4 w-4 text-fuchsia-500" />
            AI Literature Review
          </Button>
          <Button 
            variant={activeView === "research_map" ? "secondary" : "ghost"} 
            onClick={() => setActiveView("research_map")}
            className={cn("w-full justify-start h-8 px-2 text-sm font-normal", activeView !== "research_map" && "text-muted-foreground")}
          >
            <Map className="mr-2 h-4 w-4 text-emerald-500" />
            Research Map
          </Button>
        </div>

        {/* Collections Section */}
        <div className="mb-6">
          <div className="px-2 mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground tracking-wider">
            Collections
            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full hover:bg-accent">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1">
            {loadingCollections ? (
              <div className="px-2 text-sm text-muted-foreground animate-pulse">Loading...</div>
            ) : collections?.length ? collections.map((col) => (
              <Button key={col.id} variant="ghost" className="w-full justify-start h-8 px-2 text-sm font-normal">
                <Library className="mr-2 h-4 w-4 text-fuchsia-500" />
                {col.title}
              </Button>
            )) : (
              <div className="px-2 text-xs text-muted-foreground italic">No collections yet</div>
            )}
          </div>
        </div>

        {/* Folders Section */}
        <div>
          <div className="px-2 mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground tracking-wider">
            Folders
            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full hover:bg-accent">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1">
            {loadingFolders ? (
              <div className="px-2 text-sm text-muted-foreground animate-pulse">Loading...</div>
            ) : folders?.length ? folders.map((folder) => (
              <Button key={folder.id} variant="ghost" className="w-full justify-start h-8 px-2 text-sm font-normal">
                <Folder className="mr-2 h-4 w-4 text-blue-500" />
                {folder.name}
              </Button>
            )) : (
              <div className="px-2 text-xs text-muted-foreground italic">No folders yet</div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
