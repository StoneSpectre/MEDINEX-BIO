from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError
import os
import json
from dotenv import load_dotenv

try:
    from graph.db import MedinexGraph
except ImportError:
    MedinexGraph = None

load_dotenv()

class GraphRAGEngine:
    def __init__(self):
        self.graph = None
        self.connected = False
        self.connect()

    def connect(self):
        if not MedinexGraph:
            print("Warning: graph.db.MedinexGraph not found.")
            return
            
        try:
            self.graph = MedinexGraph()
            # Test connection
            self.graph.run("RETURN 1")
            self.connected = True
            print("Connected to Neo4j successfully via MedinexGraph.")
        except (ServiceUnavailable, AuthError, Exception) as e:
            print(f"Warning: Could not connect to Neo4j. GraphRAG will return mock/stub data. ({str(e)})")
            self.connected = False
            self.graph = None

    def close(self):
        if self.graph:
            self.graph.close()

    def query(self, question: str):
        # We perform a basic disease extraction from the question for demo purposes
        # In a real setup, an LLM extracts the entity and builds the cypher query
        query_lower = question.lower()
        
        disease_target = None
        if "alzheimer" in query_lower:
            disease_target = "Alzheimer"
        elif "parkinson" in query_lower:
            disease_target = "Parkinson"
        elif "diabetes" in query_lower:
            disease_target = "Diabetes"
        elif "cancer" in query_lower:
            disease_target = "Cancer"
            
        if not self.connected or not self.graph:
            return {
                "answer": "Neo4j is not running. I would normally write a Cypher query to traverse the knowledge graph to answer this.",
                "cypher": "MATCH (d:Disease)-[:HAS_SYMPTOM]->(s:Symptom) RETURN d, s LIMIT 10",
                "data": [{"mock_data": "Neo4j connection not active. Please start Neo4j container."}]
            }
            
        if disease_target:
            graph_data = self.graph.get_disease_graph(disease_target)
            return {
                "answer": f"Here is the topological graph data retrieved for {disease_target}.",
                "cypher": "MATCH (d:Disease) WHERE toLower(d.name) CONTAINS ...",
                "data": graph_data
            }
            
        # Fallback cypher if no specific disease matches
        try:
            graph_data = self.graph.run("MATCH (n) RETURN labels(n) as label, count(n) as count")
            return {
                "answer": "Here is a summary of the current knowledge graph nodes.",
                "cypher": "MATCH (n) RETURN labels(n) as label, count(n) as count",
                "data": graph_data
            }
        except Exception as e:
             return {
                "answer": f"Neo4j Query Failed: {str(e)}",
                "cypher": "",
                "data": []
            }

if __name__ == "__main__":
    engine = GraphRAGEngine()
    result = engine.query("Which genes are linked to Alzheimer's?")
    print(json.dumps(result, indent=2))
    engine.close()
