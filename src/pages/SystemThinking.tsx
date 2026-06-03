import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Brain, Search, Database, BookOpen, Activity, ArrowRight, Loader2, Library } from "lucide-react";
import CardiorenalSyndrome from "@/components/systems/essays/CardiorenalSyndrome";
import SepsisPhysiology from "@/components/systems/essays/SepsisPhysiology";
import AcidBaseIntegration from "@/components/systems/essays/AcidBaseIntegration";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useProgressTracking } from "@/hooks/useProgressTracking";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { searchPubMed, type PubMedArticle } from "@/lib/pubmed";
import { searchClinicalTrials, type ClinicalTrial } from "@/lib/clinicaltrials";

const SystemThinking = () => {
  const { markModuleVisited } = useProgressTracking();

  const [pubmedQuery, setPubmedQuery] = useState("Cardiorenal Syndrome");
  const [pubmedResults, setPubmedResults] = useState<PubMedArticle[]>([]);
  const [isSearchingPubMed, setIsSearchingPubMed] = useState(false);

  const [clinicalQuery, setClinicalQuery] = useState("Cardiorenal Syndrome");
  const [clinicalResults, setClinicalResults] = useState<ClinicalTrial[]>([]);
  const [isSearchingClinical, setIsSearchingClinical] = useState(false);

  useEffect(() => {
    markModuleVisited('systemThinking');
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

  return (
    <Layout>
      <div className="container py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-systems/10">
              <Brain className="h-5 w-5 text-systems" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold">Integrative Systems Intelligence</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Explore complex cross-system interactions like Cardiorenal Syndrome and Acid-Base balance, where isolated physiological models merge into clinical reality.
          </p>
        </div>

        <Tabs defaultValue="explorer" className="w-full">
          <TabsList className="mb-8 flex w-full max-w-3xl bg-muted/50 p-1 overflow-x-auto h-auto flex-wrap">
            <TabsTrigger value="explorer" className="flex-1 min-w-[150px] gap-2 py-2">
              <BookOpen className="h-4 w-4" /> Concept Explorer
            </TabsTrigger>
            <TabsTrigger value="essays" className="flex-1 min-w-[150px] gap-2 py-2">
              <Library className="h-4 w-4" /> Integrative Essays
            </TabsTrigger>
            <TabsTrigger value="research" className="flex-1 min-w-[150px] gap-2 py-2">
              <Search className="h-4 w-4" /> Research Literature
            </TabsTrigger>
            <TabsTrigger value="datasets" className="flex-1 min-w-[150px] gap-2 py-2">
              <Database className="h-4 w-4" /> Dataset Hub
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explorer" className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Cross-System Pathologies</h2>
              <p className="text-muted-foreground mb-6">Structured biomedical knowledge linking multiple organ systems and their coupled control failures.</p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              {/* Concept Card 1 */}
              <Card className="flex flex-col border-border/60 hover:border-primary/30 transition-colors shadow-sm">
                <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl text-primary">Cardiorenal Syndrome</CardTitle>
                    <Badge variant="outline">Heart-Kidney Axis</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 flex-1 space-y-5">
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    An umbrella term defining disorders of the heart and kidneys whereby acute or chronic dysfunction in one organ may induce acute or chronic dysfunction of the other.
                  </p>
                  
                  <div className="space-y-3 bg-muted/20 p-4 rounded-lg">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" /> Key Pathogenic Mechanisms
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 mt-1 shrink-0 text-systems" /> Reduced cardiac output lowering renal perfusion</li>
                      <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 mt-1 shrink-0 text-systems" /> Venous congestion increasing renal interstitial pressure</li>
                      <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 mt-1 shrink-0 text-systems" /> Maladaptive neurohormonal activation (RAAS, SNS)</li>
                    </ul>
                  </div>
                  
                  <Button className="w-full mt-auto" variant="default">Explore Full Pathway</Button>
                </CardContent>
              </Card>

              {/* Concept Card 2 */}
              <Card className="flex flex-col border-border/60 hover:border-primary/30 transition-colors shadow-sm">
                <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl text-primary">Acid-Base Balance</CardTitle>
                    <Badge variant="outline">Metabolic/Respiratory Axis</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 flex-1 space-y-5">
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    The tight regulation of blood pH (7.35-7.45) requiring immediate respiratory compensation and slower, sustained renal regulation of bicarbonate.
                  </p>
                  
                  <div className="space-y-3 bg-muted/20 p-4 rounded-lg">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" /> Key Physiological Mechanisms
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 mt-1 shrink-0 text-systems" /> Chemical buffering (Bicarbonate, Phosphate, Proteins)</li>
                      <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 mt-1 shrink-0 text-systems" /> Respiratory control of PaCO2 via central chemoreceptors</li>
                      <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 mt-1 shrink-0 text-systems" /> Renal excretion of H+ and reabsorption/generation of HCO3-</li>
                    </ul>
                  </div>
                  
                  <Button className="w-full mt-auto" variant="outline">Explore Full Pathway</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="essays" className="animate-fade-in">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Deep-Dive Clinical Reasoning</h2>
              <p className="text-muted-foreground">Long-form physiological essays exploring complex systems integration.</p>
            </div>

            <Tabs defaultValue="cardiorenal-essay" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/30">
                <TabsTrigger value="cardiorenal-essay">Cardiorenal Syndrome</TabsTrigger>
                <TabsTrigger value="sepsis-essay">Sepsis Physiology</TabsTrigger>
                <TabsTrigger value="acidbase-essay">Acid-Base Integration</TabsTrigger>
              </TabsList>
              
              <div className="bg-background border border-border/60 p-6 rounded-xl shadow-sm">
                <TabsContent value="cardiorenal-essay" className="mt-0">
                  <CardiorenalSyndrome />
                </TabsContent>
                
                <TabsContent value="sepsis-essay" className="mt-0">
                  <SepsisPhysiology />
                </TabsContent>
                
                <TabsContent value="acidbase-essay" className="mt-0">
                  <AcidBaseIntegration />
                </TabsContent>
              </div>
            </Tabs>
          </TabsContent>

          <TabsContent value="research" className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Biomedical Literature Studio</h2>
              <p className="text-muted-foreground mb-6">Search and analyze integrative physiology papers powered by PubMed.</p>
            </div>
            
            <div className="flex gap-4 mb-8 bg-muted/30 p-2 rounded-lg border border-border/50">
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search integrative literature..." 
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
              <h2 className="text-2xl font-semibold mb-2">Curated Integrative Datasets</h2>
              <p className="text-muted-foreground mb-6">
                Access high-quality, open-source clinical trials for systemic disorders and cross-organ pathologies.
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

        </Tabs>
      </div>
    </Layout>
  );
};

export default SystemThinking;
