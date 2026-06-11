import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Map, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopicMapVisProps {
  projectId: string;
}

const CLUSTER_COLORS = ["#1BC99A", "#A78BFA", "#F59E0B", "#60A5FA", "#F472B6"];

export function TopicMapVis({ projectId }: TopicMapVisProps) {
  const [hasGenerated, setHasGenerated] = useState(false);
  
  // Use tanstack query just to mock loading state manually first
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['research_map', projectId],
    queryFn: async () => {
      // Mocked endpoint behavior
      await new Promise(res => setTimeout(res, 2000));
      return [
        { id: "1", title: "LRRK2 kinase activity in Parkinson disease pathogenesis", x: 12, y: 15, cluster: 0, cluster_name: "Genetics" },
        { id: "2", title: "Identification of SNCA mutations in familial Parkinson disease", x: 10, y: 11, cluster: 0, cluster_name: "Genetics" },
        { id: "3", title: "GBA variants and Parkinson disease risk", x: 15, y: 8, cluster: 0, cluster_name: "Genetics" },
        { id: "4", title: "Mitochondrial dysfunction in early-onset PD", x: 45, y: 55, cluster: 1, cluster_name: "Pathogenesis" },
        { id: "5", title: "Alpha-synuclein aggregation pathways", x: 50, y: 48, cluster: 1, cluster_name: "Pathogenesis" },
        { id: "6", title: "Clinical trials of LRRK2 inhibitors", x: 85, y: 80, cluster: 2, cluster_name: "Therapeutics" },
        { id: "7", title: "Genetic landscape of late-onset Parkinson's", x: 8, y: 18, cluster: 0, cluster_name: "Genetics" },
        { id: "8", title: "Lysosomal storage disorders and neurodegeneration", x: 55, y: 52, cluster: 1, cluster_name: "Pathogenesis" }
      ];
    },
    enabled: hasGenerated
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 border border-border/50 p-3 rounded-lg shadow-xl max-w-[250px] backdrop-blur-md">
          <p className="text-xs font-semibold text-foreground mb-1">{data.title}</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CLUSTER_COLORS[data.cluster % CLUSTER_COLORS.length] }}></span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{data.cluster_name}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!hasGenerated) {
    return (
      <div className="h-full flex flex-col items-center justify-center border border-border/50 rounded-lg bg-card/20 p-8 text-center">
        <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
          <Map className="h-8 w-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Research Map</h2>
        <p className="text-muted-foreground max-w-lg mb-8">
          Embed your saved collection using PubMedBERT and visualize thematic clusters. 
          Discover hidden literature gaps and highly-dense research areas.
        </p>
        <Button 
          onClick={() => setHasGenerated(true)} 
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          size="lg"
        >
          <Map className="h-5 w-5" />
          Generate Spatial Topic Map
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card/30 border border-border/50 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Map className="h-4 w-4 text-emerald-500" />
          Thematic Clustering (PubMedBERT + K-Means)
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Re-Cluster
        </Button>
      </div>

      <div className="flex-1 p-6 flex relative">
        {isLoading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
          </div>
        ) : null}

        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis type="number" dataKey="x" name="UMAP 1" hide />
            <YAxis type="number" dataKey="y" name="UMAP 2" hide />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            
            <Scatter name="Papers" data={data || []} fill="#8884d8">
              {(data || []).map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={CLUSTER_COLORS[entry.cluster % CLUSTER_COLORS.length]} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
