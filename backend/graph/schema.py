"""
medinex/graph/schema.py

Defines all node types and relationship types for the
Medinex Biomedical Knowledge Graph.

Node types:   Disease, Drug, Gene, Protein, Symptom, Pathway, Paper, Researcher
Relationship: HAS_SYMPTOM, ASSOCIATED_WITH_GENE, ENCODES, INVOLVED_IN,
              TREATS, TARGETS, CITED_BY, AUTHORED_BY, PART_OF_PATHWAY
"""

# ── Node Labels ──────────────────────────────────────────────

NODE_LABELS = {
    "Disease":    "A medical condition or disorder",
    "Drug":       "A pharmaceutical compound or treatment",
    "Gene":       "A genomic locus encoding a functional product",
    "Protein":    "A protein product encoded by a gene",
    "Symptom":    "A clinical manifestation of disease",
    "Pathway":    "A biological pathway (KEGG/Reactome)",
    "Paper":      "A published research paper (PubMed)",
    "Researcher": "A researcher or author",
}

# ── Relationship Types ────────────────────────────────────────

RELATIONSHIPS = {
    # Disease relationships
    "HAS_SYMPTOM":           ("Disease",    "Symptom"),
    "ASSOCIATED_WITH_GENE":  ("Disease",    "Gene"),
    "ASSOCIATED_WITH_DRUG":  ("Disease",    "Drug"),

    # Drug relationships
    "TREATS":                ("Drug",       "Disease"),
    "TARGETS":               ("Drug",       "Protein"),
    "INTERACTS_WITH":        ("Drug",       "Drug"),

    # Gene / Protein
    "ENCODES":               ("Gene",       "Protein"),
    "INVOLVED_IN":           ("Gene",       "Pathway"),
    "PART_OF_PATHWAY":       ("Protein",    "Pathway"),

    # Literature
    "MENTIONS_DISEASE":      ("Paper",      "Disease"),
    "MENTIONS_GENE":         ("Paper",      "Gene"),
    "MENTIONS_DRUG":         ("Paper",      "Drug"),
    "CITED_BY":              ("Paper",      "Paper"),
    "AUTHORED_BY":           ("Paper",      "Researcher"),
}

# ── Node Property Schemas ────────────────────────────────────

DISEASE_PROPS = {
    "id":          "str  — primary key (OMIM or MeSH ID)",
    "name":        "str  — canonical name",
    "cui":         "str  — UMLS Concept Unique Identifier",
    "mesh_id":     "str  — MeSH descriptor ID (D...)",
    "omim_id":     "str  — OMIM disease ID",
    "description": "str  — short definition",
    "synonyms":    "list — alternate names",
    "category":    "str  — e.g. Neurological, Cardiovascular",
}

DRUG_PROPS = {
    "id":           "str  — DrugBank ID (DB...)",
    "name":         "str  — canonical name",
    "cui":          "str  — UMLS CUI",
    "drugbank_id":  "str  — DrugBank primary ID",
    "pubchem_cid":  "str  — PubChem Compound ID",
    "description":  "str  — mechanism of action",
    "type":         "str  — SmallMolecule / Biologic / etc.",
    "groups":       "list — approved / experimental / etc.",
    "synonyms":     "list — brand names, aliases",
}

GENE_PROPS = {
    "id":           "str  — NCBI Gene ID",
    "symbol":       "str  — gene symbol (e.g. SNCA, BRCA1)",
    "name":         "str  — full gene name",
    "cui":          "str  — UMLS CUI",
    "entrez_id":    "str  — NCBI Entrez ID",
    "ensembl_id":   "str  — Ensembl gene ID",
    "chromosome":   "str  — chromosomal location",
    "description":  "str  — function summary",
}

PROTEIN_PROPS = {
    "id":           "str  — UniProt accession",
    "name":         "str  — protein name",
    "gene_symbol":  "str  — encoding gene symbol",
    "uniprot_id":   "str  — UniProt ID",
    "function":     "str  — molecular function",
}

SYMPTOM_PROPS = {
    "id":           "str  — MeSH or SNOMED CT ID",
    "name":         "str  — symptom name",
    "cui":          "str  — UMLS CUI",
    "snomed_id":    "str  — SNOMED CT concept ID",
    "mesh_id":      "str  — MeSH ID",
    "description":  "str  — clinical description",
}

PATHWAY_PROPS = {
    "id":           "str  — KEGG or Reactome ID",
    "name":         "str  — pathway name",
    "source":       "str  — KEGG / Reactome / GO",
    "description":  "str  — pathway description",
}

PAPER_PROPS = {
    "pmid":         "str  — PubMed ID (primary key)",
    "title":        "str  — paper title",
    "abstract":     "str  — abstract text",
    "year":         "int  — publication year",
    "journal":      "str  — journal name",
    "doi":          "str  — DOI",
    "mesh_terms":   "list — MeSH tags from PubMed",
    "citation_count": "int — number of citations",
}

RESEARCHER_PROPS = {
    "id":           "str  — Semantic Scholar author ID",
    "name":         "str  — full name",
    "affiliation":  "str  — institution",
    "h_index":      "int  — h-index",
    "paper_count":  "int  — total papers",
}
