// medinex/frontend/src/types/index.ts

export interface DiseaseNode {
  id: string;
  name: string;
  cui?: string;
  category?: string;
  description?: string;
}

export interface GeneNode {
  id: string;
  symbol: string;
  name: string;
}

export interface DrugNode {
  id: string;
  name: string;
}

export interface SymptomNode {
  id: string;
  name: string;
}

export interface PathwayNode {
  id: string;
  name: string;
  source: string;
}

export interface PaperNode {
  pmid: string;
  title?: string;
  year?: number;
  journal?: string;
  pagerank?: number;
  in_degree?: number;
  is_landmark?: boolean;
}

export interface ResearcherNode {
  id: string;
  name: string;
  affiliation?: string;
  h_index?: number;
  paper_count?: number;
  papers_in_graph?: number;
  diseases_covered?: number;
}

export interface DiseaseGraph {
  disease: DiseaseNode;
  symptoms: SymptomNode[];
  genes: GeneNode[];
  drugs: DrugNode[];
  papers: PaperNode[];
  pathways: PathwayNode[];
}

export interface SearchResult {
  label: string;
  id: string;
  name: string;
  symbol?: string;
}

export interface PathStep {
  node_names: string[];
  node_labels: string[];
  rel_types: string[];
  hops: number;
}

export interface TimelinePoint {
  year: number;
  paper_count: number;
}

export interface RelatedDisease {
  id: string;
  name: string;
  category?: string;
  shared_genes: number;
  top_genes: string[];
}

export interface CompetingTheory {
  disease_id: string;
  disease: string;
  gene_A: string;
  gene_B: string;
  papers_for_g1: number;
  papers_for_g2: number;
  tension_score: number;
}

export interface GraphStats {
  nodes: Record<string, number>;
  edges: Record<string, number>;
}
