import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceApi, SavedPaper } from "@/lib/api/workspace";
import { Network, ExternalLink, Clock, CheckCircle2, BookOpen, Quote, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PapersTableProps {
  projectId: string;
}

const statusConfig = {
  unread: { icon: Clock, label: "Unread", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
  reading: { icon: BookOpen, label: "Reading", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  done: { icon: CheckCircle2, label: "Done", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  cited: { icon: Quote, label: "Cited", color: "bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20" },
};

export function PapersTable({ projectId }: PapersTableProps) {
  const queryClient = useQueryClient();
  const { data: papers, isLoading } = useQuery({
    queryKey: ['papers', projectId],
    queryFn: () => workspaceApi.getPapers(projectId),
    enabled: !!projectId
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ paperId, status }: { paperId: string, status: string }) => 
      workspaceApi.updatePaperStatus(paperId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers', projectId] });
      queryClient.invalidateQueries({ queryKey: ['literatureStats', projectId] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4 text-muted-foreground">
          <FileText className="h-8 w-8 opacity-20" />
          <p>Loading your library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <div className="min-w-full inline-block align-middle">
        <div className="border rounded-lg overflow-hidden shadow-sm m-6 bg-card">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[40%]">
                  Paper
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Graph Link
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {papers?.length ? papers.map((paper) => {
                const config = statusConfig[paper.status as keyof typeof statusConfig] || statusConfig.unread;
                const StatusIcon = config.icon;
                
                return (
                  <tr key={paper.id} className="group hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="px-6 py-4 whitespace-normal">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground/50 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:text-teal-500 transition-colors">
                            {paper.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {paper.authors.slice(0, 3).join(", ")} {paper.authors.length > 3 ? "et al." : ""} • {paper.pub_year}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline" className={cn("font-normal flex w-fit items-center gap-1.5 px-2.5 py-0.5 shadow-none", config.color)}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {config.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {paper.neo4j_node_id ? (
                        <Badge variant="outline" className="font-normal bg-teal-500/10 text-teal-500 border-teal-500/20 gap-1.5 shadow-none">
                          <Network className="h-3 w-3" />
                          <span className="font-mono text-[10px]">{paper.neo4j_node_id}</span>
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        Read <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Library className="h-8 w-8 opacity-20 mb-2" />
                      <p>No papers saved in this project yet.</p>
                      <Button variant="outline" size="sm" className="mt-4">Import from PubMed</Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
