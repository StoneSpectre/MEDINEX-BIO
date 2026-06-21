import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles, Database, TrendingUp } from "lucide-react";

export default function RecommendationDemo() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [abstract, setAbstract] = useState("We discovered a novel biomarker for renal cell carcinoma that outperforms existing PD-L1 assays.");
  const [context, setContext] = useState("I am an oncologist researching early detection of kidney cancers.");

  const testPaperRec = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/recommendations/paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paper_id: "example-paper-uuid",
          user_context: context,
          abstract: abstract
        })
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      setResult({ type: "paper", data });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testDatasetRank = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/recommendations/dataset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasets: [
            { id: "ds1", name: "Tiny Dataset", total_rows: 50, total_columns: 2 },
            { id: "ds2", name: "Massive Dense Dataset", total_rows: 50000, total_columns: 200 },
            { id: "ds3", name: "Sparse Med Dataset", total_rows: 1000, total_columns: 500 }
          ],
          max_n: 50000,
          max_c: 500
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult({ type: "dataset", data });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testTopicVelocity = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/recommendations/topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cluster_id: "cluster-immunotherapy-123",
          horizon_months: 6
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult({ type: "topic", data });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Recommendation Engine Demo</h1>
        <p className="text-slate-500">Test the live Phase 5 API endpoints for AI Explanations, Dataset Ranking, and Topic Velocity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="col-span-1 md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-blue-500" /> AI Paper Explanation</CardTitle>
            <CardDescription>Generates bullet points explaining why a paper matches your context using Claude.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Research Context</label>
              <Textarea value={context} onChange={e => setContext(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Paper Abstract</label>
              <Textarea value={abstract} onChange={e => setAbstract(e.target.value)} rows={3} />
            </div>
            <Button onClick={testPaperRec} disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Get AI Explanation"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5 text-emerald-500" /> Dataset Quality</CardTitle>
            <CardDescription>Ranks 3 test datasets based on data density.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testDatasetRank} variant="outline" disabled={loading} className="w-full">Test Ranking</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-500" /> Topic Velocity</CardTitle>
            <CardDescription>Calculates growth trend for a research topic.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testTopicVelocity} variant="outline" disabled={loading} className="w-full">Test Velocity</Button>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader>
            <CardTitle>API Response</CardTitle>
            <CardDescription>Endpoint successfully returned data.</CardDescription>
          </CardHeader>
          <CardContent>
            {result.type === "paper" && (
              <div className="space-y-2">
                <div className="font-medium text-green-700">Similarity Score: {result.data.score}</div>
                <ul className="list-disc pl-5 space-y-1">
                  {result.data.explanation_bullets.map((b: string, i: number) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            )}
            
            {result.type === "dataset" && (
              <div className="space-y-4">
                {result.data.map((d: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-white rounded-md border">
                    <span className="font-medium">{d.dataset_id}</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-sm">Score: {d.quality_score.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            )}

            {result.type === "topic" && (
              <div className="space-y-2">
                <div className="p-4 bg-white rounded-md border text-center">
                  <div className="text-sm text-slate-500 mb-1">Cluster: {result.data.cluster_id}</div>
                  <div className="text-3xl font-bold">{result.data.velocity.toFixed(2)}</div>
                  <div className="text-sm mt-1 uppercase tracking-wide font-semibold text-purple-600">Trend: {result.data.trend}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
