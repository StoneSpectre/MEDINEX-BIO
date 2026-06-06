import React, { useState } from "react";
import { Search, Loader2, Sparkles, BrainCircuit, Activity, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type SourceDocument = {
  pmid?: str;
  text?: str;
  score?: float;
  metadata?: any;
};

type QueryResponse = {
  answer: str;
  sources: SourceDocument[];
  metadata: any;
};

export default function Assistant() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("hybrid");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: query,
          top_k: 5,
          mode: mode,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to the backend AI engine. Make sure the FastAPI server is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-mono">
      {/* Background gradients */}
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.06)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(255,78,205,0.06)_0%,transparent_70%)] pointer-events-none" />
      
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="container relative z-10 max-w-5xl py-12">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-sm mb-8 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <div className="text-center mb-12">
          <div className="text-[11px] tracking-[6px] text-cyan-400 uppercase mb-4 opacity-80">
            Powered by FastAPI & Transformer Models
          </div>
          <h1 className="text-4xl md:text-6xl font-bold font-sans tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-400 to-fuchsia-500">
            Biomedical Assistant
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Ask any medical or biological question. Our local AI models will retrieve the most relevant evidence from your dataset using advanced semantic similarity and knowledge graphs.
          </p>
        </div>

        {/* Search Interface */}
        <Card className="bg-slate-900/80 border-cyan-500/20 backdrop-blur-xl shadow-2xl shadow-cyan-900/20 mb-8">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="e.g., What are the biomarkers for Alzheimer's?"
                  className="pl-10 h-12 bg-slate-950/50 border-slate-700 text-lg placeholder:text-slate-500"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              
              <div className="w-full md:w-48">
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger className="h-12 bg-slate-950/50 border-slate-700">
                    <SelectValue placeholder="Engine" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="hybrid">
                      <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-fuchsia-400" /> Hybrid (BM25+Vec)</div>
                    </SelectItem>
                    <SelectItem value="semantic">
                      <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-400" /> FAISS Vector</div>
                    </SelectItem>
                    <SelectItem value="rag">
                      <div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-emerald-400" /> Local RAG</div>
                    </SelectItem>
                    <SelectItem value="graph">
                      <div className="flex items-center gap-2"><Database className="h-4 w-4 text-blue-400" /> GraphRAG</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="h-12 px-8 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold tracking-wide"
                disabled={loading || !query.trim()}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Synthesize"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results Area */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 animate-pulse">
            <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-6" />
            <p className="tracking-widest uppercase text-sm">Querying {mode.toUpperCase()} Engine...</p>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Answer Card */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-cyan-400">
                    <BrainCircuit className="h-5 w-5" /> Synthesis
                  </h3>
                  <span className="text-xs font-mono bg-slate-800 px-3 py-1 rounded-full text-slate-300">
                    {result.metadata.engine} Engine
                  </span>
                </div>
                <div className="text-slate-200 leading-relaxed text-lg whitespace-pre-wrap">
                  {result.answer}
                </div>
              </CardContent>
            </Card>

            {/* Source Documents */}
            {result.sources && result.sources.length > 0 && (
              <div>
                <h3 className="text-sm uppercase tracking-widest text-slate-500 mb-4 ml-2">Retrieved Evidence Context</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {result.sources.map((source, idx) => {
                    const pmid = source.pmid || source.metadata?.pmid;
                    const text = source.text || source.metadata?.text || "No text available.";
                    
                    return (
                    <Card key={idx} className="bg-slate-950/50 border-slate-800 hover:border-cyan-500/30 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs font-mono text-fuchsia-400 bg-fuchsia-400/10 px-2 py-1 rounded">
                            {pmid ? `PMID: ${pmid}` : "Source"}
                          </span>
                          {source.score !== undefined && (
                            <span className="text-xs font-mono text-emerald-400">
                              Score: {source.score.toFixed(3)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-6">
                          {text}
                        </p>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
