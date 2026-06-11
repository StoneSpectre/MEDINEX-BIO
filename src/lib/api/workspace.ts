export interface Project {
  id: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  visibility: "private" | "shared" | "public";
  updated_at: string;
}

export interface Folder {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  position: number;
}

export interface Collection {
  id: string;
  project_id: string;
  folder_id: string | null;
  title: string;
  description: string;
  color: string;
  tags: string[];
}

export interface SavedPaper {
  id: string;
  project_id: string;
  collection_id: string | null;
  folder_id: string | null;
  title: string;
  abstract: string | null;
  authors: string[];
  journal: string | null;
  pub_year: number | null;
  status: "unread" | "reading" | "done" | "cited";
  tags: string[];
  neo4j_node_id: string | null;
  node_type: string | null;
}

export interface LiteratureStats {
  total: number;
  unread: number;
  reading: number;
  done: number;
  cited: number;
  tagged: number;
  graph_linked: number;
}

const API_BASE = "/api/v1";

export const workspaceApi = {
  // Projects
  getProjects: async (): Promise<Project[]> => {
    // Return mock project so the UI opens immediately
    return [
      {
        id: "proj_demo_1",
        title: "Alzheimer's Research",
        description: "Mock project for testing the workspace UI.",
        color: "#34d399",
        icon: "brain",
        visibility: "private",
        updated_at: new Date().toISOString()
      }
    ];
  },
  createProject: async (data: Partial<Project>): Promise<Project> => {
    return {
      id: "proj_demo_2",
      title: data.title || "New Project",
      description: data.description || "",
      color: "#34d399",
      icon: "brain",
      visibility: "private",
      updated_at: new Date().toISOString()
    };
  },
  
  // Collections
  getCollections: async (projectId: string): Promise<Collection[]> => {
    return [
      { id: "col_1", project_id: projectId, folder_id: null, title: "Amyloid Beta Pathways", description: "", color: "purple", tags: [] },
      { id: "col_2", project_id: projectId, folder_id: null, title: "Tau Protein Aggregation", description: "", color: "blue", tags: [] }
    ];
  },

  // Folders
  getFolders: async (projectId: string): Promise<Folder[]> => {
    return [
      { id: "fld_1", project_id: projectId, parent_id: null, name: "Clinical Trials", position: 0 }
    ];
  },

  // Saved Papers
  getPapers: async (projectId: string): Promise<SavedPaper[]> => {
    return [
      {
        id: "paper_1",
        project_id: projectId,
        collection_id: "col_1",
        folder_id: null,
        title: "Aducanumab: Human anti-amyloid monoclonal antibody",
        abstract: "Aducanumab is a human monoclonal antibody that selectively targets aggregated Aβ.",
        authors: ["Sevigny J", "Chiao P"],
        journal: "Nature",
        pub_year: 2016,
        status: "done",
        tags: ["antibody", "amyloid"],
        neo4j_node_id: "n4j_1",
        node_type: "paper"
      },
      {
        id: "paper_2",
        project_id: projectId,
        collection_id: "col_2",
        folder_id: null,
        title: "Tau propagation in Alzheimer's disease",
        abstract: "Tau pathology spreads hierarchically throughout the brain.",
        authors: ["Braak H", "Del Tredici K"],
        journal: "Acta Neuropathologica",
        pub_year: 2011,
        status: "reading",
        tags: ["tau", "pathology"],
        neo4j_node_id: "n4j_2",
        node_type: "paper"
      }
    ];
  },
  
  // Literature Tracker
  getStats: async (projectId: string): Promise<LiteratureStats> => {
    return {
      total: 124,
      unread: 45,
      reading: 12,
      done: 67,
      cited: 15,
      tagged: 89,
      graph_linked: 110
    };
  },
  updatePaperStatus: async (paperId: string, status: string): Promise<SavedPaper> => {
    return {
      id: paperId,
      project_id: "proj_demo_1",
      collection_id: null,
      folder_id: null,
      title: "Mock Paper",
      abstract: null,
      authors: [],
      journal: null,
      pub_year: null,
      status: status as any,
      tags: [],
      neo4j_node_id: null,
      node_type: null
    };
  }
};
