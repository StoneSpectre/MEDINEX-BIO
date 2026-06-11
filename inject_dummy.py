from backend.graph.db import MedinexGraph
g = MedinexGraph()
g.run('MATCH (n) DETACH DELETE n')

extracted_data = {
    "nodes": [
        {"id": "D10", "type": "Disease", "name": "Cystic Fibrosis"},
        {"id": "G10", "type": "Gene", "name": "CFTR"},
        {"id": "S10", "type": "Symptom", "name": "Chronic Cough"},
        {"id": "D11", "type": "Disease", "name": "Asthma"},
        {"id": "S11", "type": "Symptom", "name": "Wheezing"},
        {"id": "DR10", "type": "Drug", "name": "Albuterol"},
        {"id": "D12", "type": "Disease", "name": "Type 2 Diabetes"},
        {"id": "G12", "type": "Gene", "name": "TCF7L2"},
        {"id": "S12", "type": "Symptom", "name": "Polyuria"},
        {"id": "DR12", "type": "Drug", "name": "Metformin"},
        {"id": "D13", "type": "Disease", "name": "Hypertension"},
        {"id": "S13", "type": "Symptom", "name": "Headache"},
        {"id": "DR13", "type": "Drug", "name": "Lisinopril"},
        {"id": "D14", "type": "Disease", "name": "Alzheimer's Disease"},
        {"id": "G14", "type": "Gene", "name": "APOE4"},
        {"id": "S14", "type": "Symptom", "name": "Memory Loss"},
        {"id": "DR14", "type": "Drug", "name": "Donepezil"},
        {"id": "D15", "type": "Disease", "name": "Rheumatoid Arthritis"},
        {"id": "S15", "type": "Symptom", "name": "Joint Pain"},
        {"id": "G15", "type": "Gene", "name": "HLA-DRB1"},
        {"id": "DR15", "type": "Drug", "name": "Methotrexate"},
        {"id": "D16", "type": "Disease", "name": "Tuberculosis"},
        {"id": "S16", "type": "Symptom", "name": "Hemoptysis"},
        {"id": "DR16", "type": "Drug", "name": "Isoniazid"}
    ],
    "edges": [
        {"src": "D10", "dst": "G10", "relation": "ASSOCIATED_WITH_GENE"},
        {"src": "D10", "dst": "S10", "relation": "HAS_SYMPTOM"},
        {"src": "D11", "dst": "S11", "relation": "HAS_SYMPTOM"},
        {"src": "DR10", "dst": "D11", "relation": "TREATS"},
        {"src": "D12", "dst": "G12", "relation": "ASSOCIATED_WITH_GENE"},
        {"src": "D12", "dst": "S12", "relation": "HAS_SYMPTOM"},
        {"src": "DR12", "dst": "D12", "relation": "TREATS"},
        {"src": "D13", "dst": "S13", "relation": "HAS_SYMPTOM"},
        {"src": "DR13", "dst": "D13", "relation": "TREATS"},
        {"src": "D14", "dst": "G14", "relation": "ASSOCIATED_WITH_GENE"},
        {"src": "D14", "dst": "S14", "relation": "HAS_SYMPTOM"},
        {"src": "DR14", "dst": "D14", "relation": "TREATS"},
        {"src": "D15", "dst": "G15", "relation": "ASSOCIATED_WITH_GENE"},
        {"src": "D15", "dst": "S15", "relation": "HAS_SYMPTOM"},
        {"src": "DR15", "dst": "D15", "relation": "TREATS"},
        {"src": "D16", "dst": "S16", "relation": "HAS_SYMPTOM"},
        {"src": "DR16", "dst": "D16", "relation": "TREATS"},
        {"src": "D16", "dst": "S10", "relation": "HAS_SYMPTOM"}
    ]
}

for node in extracted_data["nodes"]:
    props = {"id": node["id"], "name": node["name"]}
    node_type = node["type"].capitalize()
    if node_type == "Disease":
        g.upsert_disease(props)
    elif node_type == "Gene":
        props["symbol"] = node["name"]
        g.upsert_gene(props)
    elif node_type == "Symptom":
        g.upsert_symptom(props)
    elif node_type == "Drug":
        g.upsert_drug(props)
    
for edge in extracted_data["edges"]:
    if edge["relation"] == "ASSOCIATED_WITH_GENE":
        g.link_disease_gene(edge["src"], edge["dst"])
    elif edge["relation"] == "HAS_SYMPTOM":
        g.link_disease_symptom(edge["src"], edge["dst"])
    elif edge["relation"] == "TREATS":
        g.link_drug_disease(edge["src"], edge["dst"])

print("Injected dummy data!")
