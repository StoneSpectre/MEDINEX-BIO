"""
medinex/graph/seed.py

Seeds the Neo4j Knowledge Graph with foundational clinical data.
Run this script once after starting Neo4j.
"""

from db import MedinexGraph

def seed_graph():
    print("Seeding Medinex Knowledge Graph...")
    
    with MedinexGraph() as graph:
        # 1. UPSERT DISEASES
        diseases = [
            {"id": "D1", "name": "Parkinson's Disease", "cui": "C0030567", "description": "A brain disorder that causes unintended or uncontrollable movements.", "category": "Neurological"},
            {"id": "D2", "name": "Alzheimer's Disease", "cui": "C0002395", "description": "A progressive disease that destroys memory and other important mental functions.", "category": "Neurological"},
            {"id": "D3", "name": "Type 2 Diabetes", "cui": "C0011860", "description": "A chronic condition that affects the way the body processes blood sugar.", "category": "Endocrine"},
            {"id": "D4", "name": "Breast Cancer", "cui": "C0006142", "description": "A cancer that forms in the cells of the breasts.", "category": "Oncology"},
            {"id": "D5", "name": "Hypertension", "cui": "C0020538", "description": "A condition in which the force of the blood against the artery walls is too high.", "category": "Cardiovascular"},
            {"id": "D6", "name": "Schizophrenia", "cui": "C0036341", "description": "A serious mental disorder in which people interpret reality abnormally.", "category": "Psychiatric"}
        ]
        for d in diseases:
            graph.upsert_disease(d)
            
        # 2. UPSERT GENES
        genes = [
            {"id": "G1", "symbol": "SNCA", "name": "Synuclein Alpha", "description": "Implicated in Parkinson's."},
            {"id": "G2", "symbol": "LRRK2", "name": "Leucine Rich Repeat Kinase 2", "description": "Implicated in Parkinson's."},
            {"id": "G3", "symbol": "PRKN", "name": "Parkin RBR E3 Ubiquitin Protein Ligase", "description": "Implicated in Parkinson's."},
            {"id": "G4", "symbol": "APOE", "name": "Apolipoprotein E", "description": "Implicated in Alzheimer's."},
            {"id": "G5", "symbol": "APP", "name": "Amyloid Beta Precursor Protein", "description": "Implicated in Alzheimer's."},
            {"id": "G6", "symbol": "PSEN1", "name": "Presenilin 1", "description": "Implicated in Alzheimer's."},
            {"id": "G7", "symbol": "BRCA1", "name": "BRCA1 DNA Repair Associated", "description": "Implicated in Breast Cancer."},
            {"id": "G8", "symbol": "BRCA2", "name": "BRCA2 DNA Repair Associated", "description": "Implicated in Breast Cancer."},
            {"id": "G9", "symbol": "TCF7L2", "name": "Transcription Factor 7 Like 2", "description": "Implicated in Type 2 Diabetes."},
            {"id": "G10", "symbol": "ACE", "name": "Angiotensin I Converting Enzyme", "description": "Implicated in Hypertension."}
        ]
        for g in genes:
            graph.upsert_gene(g)

        # 3. UPSERT DRUGS
        drugs = [
            {"id": "DR1", "name": "Levodopa", "description": "Dopamine precursor used for Parkinson's."},
            {"id": "DR2", "name": "Donepezil", "description": "Cholinesterase inhibitor used for Alzheimer's."},
            {"id": "DR3", "name": "Metformin", "description": "First-line medication for Type 2 Diabetes."},
            {"id": "DR4", "name": "Tamoxifen", "description": "Hormone therapy used to treat Breast Cancer."},
            {"id": "DR5", "name": "Lisinopril", "description": "ACE inhibitor used to treat Hypertension."}
        ]
        for dr in drugs:
            graph.upsert_drug(dr)

        # 4. UPSERT SYMPTOMS
        symptoms = [
            {"id": "S1", "name": "Tremor", "description": "Involuntary quivering movement."},
            {"id": "S2", "name": "Memory Loss", "description": "Unusual forgetfulness."},
            {"id": "S3", "name": "Hyperglycemia", "description": "High blood sugar."},
            {"id": "S4", "name": "Lump", "description": "Swelling or bump."},
            {"id": "S5", "name": "High Blood Pressure", "description": "Elevated blood pressure reading."}
        ]
        for s in symptoms:
            graph.upsert_symptom(s)

        # 5. UPSERT PAPERS
        papers = [
            {"pmid": "11111111", "title": "The Genetics of Parkinson's Disease", "year": 2021},
            {"pmid": "22222222", "title": "Alzheimer's and APOE4", "year": 2020},
            {"pmid": "33333333", "title": "Efficacy of Metformin in Diabetes", "year": 2019}
        ]
        for p in papers:
            graph.upsert_paper(p)

        # 6. LINKING
        # Parkinson's
        graph.link_disease_gene("D1", "G1")
        graph.link_disease_gene("D1", "G2")
        graph.link_disease_gene("D1", "G3")
        graph.link_disease_symptom("D1", "S1")
        graph.link_drug_disease("DR1", "D1")
        graph.link_paper_disease("11111111", "D1")

        # Alzheimer's
        graph.link_disease_gene("D2", "G4")
        graph.link_disease_gene("D2", "G5")
        graph.link_disease_gene("D2", "G6")
        graph.link_disease_symptom("D2", "S2")
        graph.link_drug_disease("DR2", "D2")
        graph.link_paper_disease("22222222", "D2")

        # Diabetes
        graph.link_disease_gene("D3", "G9")
        graph.link_disease_symptom("D3", "S3")
        graph.link_drug_disease("DR3", "D3")
        graph.link_paper_disease("33333333", "D3")

        # Breast Cancer
        graph.link_disease_gene("D4", "G7")
        graph.link_disease_gene("D4", "G8")
        graph.link_disease_symptom("D4", "S4")

        # Hypertension
        graph.link_disease_gene("D5", "G10")
        graph.link_disease_symptom("D5", "S5")
        graph.link_drug_disease("DR5", "D5")

    print("Knowledge Graph successfully seeded!")

if __name__ == "__main__":
    seed_graph()
