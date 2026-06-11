import { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Loader2, Network } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface ReviewDraftUIProps {
  projectId: string;
}

export function ReviewDraftUI({ projectId }: ReviewDraftUIProps) {
  const [draftContent, setDraftContent] = useState("");
  const [citationNodes, setCitationNodes] = useState<any[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateReviewMutation = useMutation({
    mutationFn: async () => {
      // Temporary mock. We will replace this with a real call to the backend.
      // const response = await fetch(`/api/workspace/projects/${projectId}/generate-review`, { method: "POST" });
      // return response.json();
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      return {
        draft: "# Literature Review: Parkinson Disease Genetic Targets\n\nBased on your saved papers, the convergence of SNCA and LRRK2 mutations point strongly to impaired mitochondrial quality control...\n\n### Findings\n- **SNCA**: Overexpression leads to early-onset neurodegeneration.\n- **LRRK2**: Kinase inhibitors show promise in preclinical models.\n\n### Open Questions\nFurther investigation is needed on the interplay between GBA variants and LRRK2 pathways.",
        network: [
          { id: "15258601", label: "SNCA Mutations" },
          { id: "16710414", label: "LRRK2 Pathogenesis" },
          { id: "19915575", label: "GBA Risk" }
        ]
      };
    },
    onSuccess: (data) => {
      setDraftContent(data.draft);
      setCitationNodes(data.network);
      setHasGenerated(true);
    }
  });

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'blockquote', 'code-block'],
      ['clean']
    ],
  };

  if (!hasGenerated) {
    return (
      <div className="h-full flex flex-col items-center justify-center border border-border/50 rounded-lg bg-card/20 p-8 text-center">
        <div className="h-16 w-16 bg-fuchsia-500/10 rounded-full flex items-center justify-center mb-6">
          <BrainCircuit className="h-8 w-8 text-fuchsia-500" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">AI Literature Review</h2>
        <p className="text-muted-foreground max-w-lg mb-8">
          Synthesize your saved papers into a comprehensive literature review draft. 
          Medinex GraphRAG will analyze your collection, highlight key themes, and construct a citation network.
        </p>
        <Button 
          onClick={() => generateReviewMutation.mutate()} 
          disabled={generateReviewMutation.isPending}
          className="gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
          size="lg"
        >
          {generateReviewMutation.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Synthesizing Collection...
            </>
          ) : (
            <>
              <BrainCircuit className="h-5 w-5" />
              Generate Review Draft
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-4 overflow-hidden">
      {/* Left side: Editor */}
      <div className="flex-1 flex flex-col bg-card/30 border border-border/50 rounded-lg overflow-hidden h-full">
        <div className="flex items-center justify-between p-3 border-b border-border/50 bg-background/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <BrainCircuit className="h-4 w-4 text-fuchsia-500" />
            AI Draft Editor
          </div>
        </div>
        <div className="flex-1 p-0 overflow-y-auto [&_.ql-container]:border-none [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-border/50 [&_.ql-editor]:min-h-[300px] [&_.ql-editor]:text-foreground">
          <ReactQuill 
            theme="snow" 
            value={draftContent} 
            onChange={setDraftContent} 
            modules={modules}
            className="h-full"
          />
        </div>
      </div>

      {/* Right side: Citation Network (Placeholder for actual graph library) */}
      <div className="w-80 flex flex-col bg-card/30 border border-border/50 rounded-lg overflow-hidden shrink-0 h-full">
        <div className="flex items-center gap-2 p-3 border-b border-border/50 bg-background/50 backdrop-blur-md font-semibold text-sm shrink-0">
          <Network className="h-4 w-4 text-emerald-500" />
          Citation Network
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <p className="text-xs text-muted-foreground mb-4">Extracted concepts and paper connections.</p>
          <div className="space-y-3">
            {citationNodes.map((node, i) => (
              <div key={i} className="text-xs p-3 rounded bg-background border border-border/50 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div className="font-medium text-foreground">{node.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
