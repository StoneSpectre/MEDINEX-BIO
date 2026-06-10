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
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error("Failed to fetch projects");
    return res.json();
  },
  createProject: async (data: Partial<Project>): Promise<Project> => {
    const res = await fetch(`${API_BASE}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create project");
    return res.json();
  },
  
  // Collections
  getCollections: async (projectId: string): Promise<Collection[]> => {
    const res = await fetch(`${API_BASE}/collections/project/${projectId}`);
    if (!res.ok) throw new Error("Failed to fetch collections");
    return res.json();
  },

  // Folders
  getFolders: async (projectId: string): Promise<Folder[]> => {
    const res = await fetch(`${API_BASE}/folders/project/${projectId}`);
    if (!res.ok) throw new Error("Failed to fetch folders");
    return res.json();
  },

  // Saved Papers
  getPapers: async (projectId: string): Promise<SavedPaper[]> => {
    const res = await fetch(`${API_BASE}/saved-papers/project/${projectId}`);
    if (!res.ok) throw new Error("Failed to fetch papers");
    return res.json();
  },
  
  // Literature Tracker
  getStats: async (projectId: string): Promise<LiteratureStats> => {
    const res = await fetch(`${API_BASE}/literature/project/${projectId}/stats`);
    if (!res.ok) throw new Error("Failed to fetch literature stats");
    return res.json();
  },
  updatePaperStatus: async (paperId: string, status: string): Promise<SavedPaper> => {
    const res = await fetch(`${API_BASE}/literature/paper/${paperId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_status: status }),
    });
    if (!res.ok) throw new Error("Failed to update status");
    return res.json();
  }
};
