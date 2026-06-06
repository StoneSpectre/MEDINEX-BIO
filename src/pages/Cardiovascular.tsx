import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { HemodynamicModel } from "@/components/cardiovascular/HemodynamicModel";
import { Heart, Info, Search, Database, BookOpen, Activity, ArrowRight, Loader2, BrainCircuit } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useProgressTracking } from "@/hooks/useProgressTracking";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { searchPubMed, type PubMedArticle } from "@/lib/pubmed";
import { searchClinicalTrials, type ClinicalTrial } from "@/lib/clinicaltrials";

const Cardiovascular = () => {
  const { markModuleVisited } = useProgressTracking();

  const [pubmedQuery, setPubmedQuery] = useState("Heart Failure Hemodynamics");
  const [pubmedResults, setPubmedResults] = useState<PubMedArticle[]>([]);
  const [isSearchingPubMed, setIsSearchingPubMed] = useState(false);

  const [clinicalQuery, setClinicalQuery] = useState("Heart Failure");
  const [clinicalResults, setClinicalResults] = useState<ClinicalTrial[]>([]);
  const [isSearchingClinical, setIsSearchingClinical] = useState(false);

  // Predictive AI State
  const [predictiveVitals, setPredictiveVitals] = useState({
    age: 50, sys_bp: 120, dia_bp: 80, cholesterol: 200, heart_rate: 70
  });
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  useEffect(() => {
    markModuleVisited('cardiovascular');
    handlePubMedSearch();
    handleClinicalSearch();
  }, [markModuleVisited]);

  const handlePubMedSearch = async () => {
    setIsSearchingPubMed(true);
    const results = await searchPubMed(pubmedQuery, 5);
    setPubmedResults(results);
    setIsSearchingPubMed(false);
  };

  const handleClinicalSearch = async () => {
    setIsSearchingClinical(true);
    const results = await searchClinicalTrials(clinicalQuery, 4);
    setClinicalResults(results);
    setIsSearchingClinical(false);
  };

  const handlePredictiveAnalysis = async () => {
    setIsPredicting(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/predict/cardiovascular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(predictiveVitals),
      });
      const data = await response.json();
      setPredictionResult(data);
    } catch (error) {
      console.error("Prediction failed:", error);
    }
    setIsPredicting(false);
  };

  return (
    <Layout>
      <div className="container py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cardio/10">
              <Heart className="h-5 w-5 text-cardio" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold">Cardiovascular Intelligence</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Explore cardiovascular physiology through interactive simulations, connected research literature, 
            and curated open datasets as part of the Medinex Biomedical Intelligence OS.
          </p>
        </div>

        <Tabs defaultValue="explorer" className="w-full">
          <TabsList className="mb-8 flex w-full max-w-3xl bg-muted/50 p-1 overflow-x-auto h-auto flex-wrap">
            <TabsTrigger value="explorer" className="flex-1 min-w-[150px] gap-2 py-2">
              <BookOpen className="h-4 w-4" /> Concept Explorer
            </TabsTrigger>
            <TabsTrigger value="simulation" className="flex-1 min-w-[150px] gap-2 py-2">
              <Activity className="h-4 w-4" /> Interactive Simulation
            </TabsTrigger>
            <TabsTrigger value="research" className="flex-1 min-w-[150px] gap-2 py-2">
              <Search className="h-4 w-4" /> Research Literature
            </TabsTrigger>
            <TabsTrigger value="datasets" className="flex-1 min-w-[150px] gap-2 py-2">
              <Database className="h-4 w-4" /> Dataset Hub
            </TabsTrigger>
            <TabsTrigger value="predictive" className="flex-1 min-w-[150px] gap-2 py-2">
              <BrainCircuit className="h-4 w-4" /> Predictive AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explorer" className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Disease & Concept Explorer</h2>
              <p className="text-muted-foreground mb-6">Structured biomedical knowledge linking physiology, pathology, and current research.</p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              {/* Concept Card 1 */}
              <Card className="flex flex-col border-border/60 hover:border-primary/30 transition-colors shadow-sm">
                <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl text-primary">Heart Failure (HFrEF)</CardTitle>
                    <Badge variant="outline">Pathology</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 flex-1 space-y-5">
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    A clinical syndrome characterized by the heart's inability to pump sufficient blood 
                    to meet the metabolic demands of the body, specifically with a reduced ejection fraction.
                  </p>
                  
                  <div className="space-y-3 bg-muted/20 p-4 rounded-lg">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" /> Key Physiological Mechanisms
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 mt-1 shrink-0 text-cardio" /> Decreased contractility (shifting Frank-Starling curve down)</li>
                      <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 mt-1 shrink-0 text-cardio" /> Compounded by compensatory RAAS activation</li>
                      <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 mt-1 shrink-0 text-cardio" /> Increased systemic sympathetic tone</li>
                    </ul>
                  </div>
                  
                  <Button className="w-full mt-auto" variant="default">Explore Full Pathway</Button>
                </CardContent>
              </Card>

              {/* Concept Card 2 */}
              <Card className="flex flex-col border-border/60 hover:border-primary/30 transition-colors shadow-sm">
                <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl text-primary">Essential Hypertension</CardTitle>
                    <Badge variant="outline">Pathology</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 flex-1 space-y-5">
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    Chronically elevated systemic arterial blood pressure leading to increased afterload 
                    and progressive target organ damage.
                  </p>
                  
                  <div className="space-y-3 bg-muted/20 p-4 rounded-lg">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" /> Key Physiological Mechanisms
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 mt-1 shrink-0 text-cardio" /> Increased systemic vascular resistance (SVR)</li>
                      <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 mt-1 shrink-0 text-cardio" /> Chronic endothelial dysfunction</li>
                      <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 mt-1 shrink-0 text-cardio" /> Left ventricular hypertrophy (compensatory response)</li>
                    </ul>
                  </div>
                  
                  <Button className="w-full mt-auto" variant="outline">Explore Full Pathway</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="simulation" className="animate-fade-in">
            {/* Info Card */}
            <Card className="mb-8 p-4 bg-accent/20 border-accent/40 shadow-sm">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Interactive Hemodynamics</p>
                  <p className="text-sm text-muted-foreground">
                    Adjust the sliders to change physiological parameters. Watch how the 
                    Frank-Starling curve shifts and how MAP, cardiac output, and oxygen 
                    delivery respond. 
                  </p>
                </div>
              </div>
            </Card>

            {/* Interactive Model */}
            <div className="bg-background border border-border/60 rounded-xl overflow-hidden shadow-sm">
              <HemodynamicModel />
            </div>

            {/* Key Concepts */}
            <section className="mt-12 pt-10 border-t border-border/50">
              <h2 className="text-xl font-semibold mb-6">Physiological Definitions</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="p-5 border-border/60 shadow-sm bg-muted/5">
                  <h3 className="font-medium text-primary mb-2">Frank-Starling Mechanism</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The heart's intrinsic ability to change its force of contraction 
                    in response to changes in venous return. More stretch = more force.
                  </p>
                </Card>
                <Card className="p-5 border-border/60 shadow-sm bg-muted/5">
                  <h3 className="font-medium text-primary mb-2">Afterload</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The resistance the heart must overcome to eject blood. Higher SVR 
                    increases afterload and reduces stroke volume.
                  </p>
                </Card>
                <Card className="p-5 border-border/60 shadow-sm bg-muted/5">
                  <h3 className="font-medium text-primary mb-2">Oxygen Delivery (DO₂)</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    DO₂ = CO × CaO₂. The amount of oxygen delivered to tissues per 
                    minute, dependent on cardiac output and blood oxygen content.
                  </p>
                </Card>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="research" className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Biomedical Literature Studio</h2>
              <p className="text-muted-foreground mb-6">Search and analyze cardiovascular papers powered by PubMed and Medinex RAG.</p>
            </div>
            
            <div className="flex gap-4 mb-8 bg-muted/30 p-2 rounded-lg border border-border/50">
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search cardiovascular literature (e.g., 'Hemodynamics in Heart Failure')..." 
                  className="w-full bg-background border-none rounded-md pl-9 pr-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-primary outline-none"
                  value={pubmedQuery}
                  onChange={(e) => setPubmedQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePubMedSearch()}
                />
              </div>
              <Button onClick={handlePubMedSearch} disabled={isSearchingPubMed}>
                {isSearchingPubMed ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Search
              </Button>
            </div>
            
            <div className="space-y-4">
              {isSearchingPubMed ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p>Searching PubMed...</p>
                </div>
              ) : pubmedResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/10">
                  <p>No literature found for this query.</p>
                </div>
              ) : (
                pubmedResults.map((paper, i) => (
                  <Card key={i} className="p-5 border-border/60 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-medium text-base text-primary mb-1 leading-snug">{paper.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {paper.authors} • <span className="italic">{paper.journal}</span> ({paper.year})
                        </p>
                      </div>
                      <Badge variant="secondary" className="whitespace-nowrap shrink-0 bg-muted">
                        PMID: {paper.id}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      <Button variant="secondary" size="sm" className="bg-primary/10 text-primary hover:bg-primary/20 border-none" onClick={() => window.open(`https://pubmed.ncbi.nlm.nih.gov/${paper.id}/`, '_blank')}>
                        Read on PubMed
                      </Button>
                      <Button variant="outline" size="sm">Add to Workspace</Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="datasets" className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Curated Cardiovascular Datasets</h2>
              <p className="text-muted-foreground mb-6">
                Access high-quality, open-source datasets for biomedical research, physiological modeling, and AI training.
              </p>
            </div>
            
            <div className="flex gap-4 mb-8 bg-muted/30 p-2 rounded-lg border border-border/50">
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search ClinicalTrials.gov..." 
                  className="w-full bg-background border-none rounded-md pl-9 pr-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-primary outline-none"
                  value={clinicalQuery}
                  onChange={(e) => setClinicalQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleClinicalSearch()}
                />
              </div>
              <Button onClick={handleClinicalSearch} disabled={isSearchingClinical}>
                {isSearchingClinical ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Search
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {isSearchingClinical ? (
                <div className="md:col-span-2 text-center py-8 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p>Fetching active clinical trials...</p>
                </div>
              ) : clinicalResults.length === 0 ? (
                <div className="md:col-span-2 text-center py-8 text-muted-foreground border rounded-lg bg-muted/10">
                  <p>No trials found for this query.</p>
                </div>
              ) : (
                clinicalResults.map((trial, i) => (
                  <Card key={i} className="p-6 flex flex-col h-full border-border/60 hover:border-primary/30 transition-colors shadow-sm bg-gradient-to-br from-background to-muted/20">
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <h3 className="font-semibold text-lg leading-tight line-clamp-3">{trial.title}</h3>
                        <Database className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="outline" className="bg-background">{trial.status}</Badge>
                        <Badge variant="outline" className="bg-background text-primary/80 border-primary/20">{trial.phase}</Badge>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed mb-6 line-clamp-3">
                        <span className="font-medium">Conditions:</span> {trial.conditions}
                      </p>
                    </div>
                    <div className="flex gap-3 mt-auto">
                      <Button className="flex-1" variant="default" onClick={() => window.open(`https://clinicaltrials.gov/study/${trial.nctId}`, '_blank')}>
                        View on ClinicalTrials.gov
                      </Button>
                      <Button variant="outline" size="icon" title="Save Trial">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="predictive" className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-semibold mb-2">AI Risk Assessment</h2>
              <p className="text-muted-foreground mb-6">
                Run real-time predictive models on patient vitals. Powered by backend machine learning algorithms.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-6 border-border/60 shadow-sm">
                <h3 className="font-semibold text-lg mb-4">Patient Vitals Input</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Age</label>
                      <input type="number" className="w-full bg-muted/50 border rounded-md px-3 py-2 text-sm" value={predictiveVitals.age} onChange={(e) => setPredictiveVitals({...predictiveVitals, age: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Heart Rate (bpm)</label>
                      <input type="number" className="w-full bg-muted/50 border rounded-md px-3 py-2 text-sm" value={predictiveVitals.heart_rate} onChange={(e) => setPredictiveVitals({...predictiveVitals, heart_rate: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Systolic BP (mmHg)</label>
                      <input type="number" className="w-full bg-muted/50 border rounded-md px-3 py-2 text-sm" value={predictiveVitals.sys_bp} onChange={(e) => setPredictiveVitals({...predictiveVitals, sys_bp: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Diastolic BP (mmHg)</label>
                      <input type="number" className="w-full bg-muted/50 border rounded-md px-3 py-2 text-sm" value={predictiveVitals.dia_bp} onChange={(e) => setPredictiveVitals({...predictiveVitals, dia_bp: Number(e.target.value)})} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-sm font-medium">Cholesterol (mg/dL)</label>
                      <input type="number" className="w-full bg-muted/50 border rounded-md px-3 py-2 text-sm" value={predictiveVitals.cholesterol} onChange={(e) => setPredictiveVitals({...predictiveVitals, cholesterol: Number(e.target.value)})} />
                    </div>
                  </div>
                  <Button className="w-full mt-4" onClick={handlePredictiveAnalysis} disabled={isPredicting}>
                    {isPredicting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BrainCircuit className="h-4 w-4 mr-2" />}
                    Analyze Risk
                  </Button>
                </div>
              </Card>
              
              <Card className="p-6 border-border/60 shadow-sm bg-muted/5">
                <h3 className="font-semibold text-lg mb-4">Prediction Results</h3>
                {predictionResult ? (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-background border">
                      <div>
                        <p className="text-sm text-muted-foreground">Calculated Risk Score</p>
                        <p className="text-3xl font-bold">{(predictionResult.risk_score * 100).toFixed(1)}%</p>
                      </div>
                      <Badge className={predictionResult.risk_category === "High" ? "bg-destructive text-destructive-foreground" : "bg-primary"}>
                        {predictionResult.risk_category} Risk
                      </Badge>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-muted-foreground">Model Output</h4>
                      <p className="text-sm bg-primary/10 text-primary p-3 rounded-md italic">"{predictionResult.message}"</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-muted-foreground">Clinical Recommendations</h4>
                      <ul className="space-y-2">
                        {predictionResult.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Activity className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-muted-foreground text-sm opacity-60">
                    <BrainCircuit className="h-12 w-12 mb-3 opacity-20" />
                    <p>Enter patient vitals and click analyze to see predictions.</p>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </Layout>
  );
};

export default Cardiovascular;
