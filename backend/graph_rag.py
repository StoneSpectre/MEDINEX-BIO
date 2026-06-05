from neo4j import GraphDatabase
import os
import json
from dotenv import load_dotenv

load_dotenv()

class GraphRAGEngine:
    def __init__(self, uri="bolt://localhost:7687", user="neo4j", password="password"):
        self.uri = uri
        self.user = user
        self.password = password
        self.driver = None
        self.connected = False
        self.connect()

    def connect(self):
        try:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            # Test connection
            with self.driver.session() as session:
                session.run("RETURN 1")
            self.connected = True
            print("Connected to Neo4j successfully.")
        except Exception as e:
            print(f"Warning: Could not connect to Neo4j at {self.uri}. GraphRAG will return mock/stub data. ({str(e)})")
            self.connected = False

    def close(self):
        if self.driver:
            self.driver.close()

    def text_to_cypher(self, question: str) -> str:
        # In a real setup, we use an LLM to generate the Cypher query.
        # Since we might not have OPENAI_API_KEY, we will use a basic mock for demonstration.
        query_lower = question.lower()
        if "alzheimer" in query_lower:
            return "MATCH (g:Gene)-[:ASSOCIATED_WITH]->(d:Disease {name: 'Alzheimer\\'s Disease'}) RETURN g.name LIMIT 10"
        return "MATCH (n) RETURN n LIMIT 5"

    def run_cypher(self, cypher: str) -> list:
        if not self.connected:
            return [{"mock_data": "Neo4j connection not active. Please start Neo4j container."}]
            
        try:
            with self.driver.session() as s:
                return [dict(r) for r in s.run(cypher)]
        except Exception as e:
            return [{"error": str(e)}]

    def query(self, question: str):
        cypher = self.text_to_cypher(question)
        graph_data = self.run_cypher(cypher)
        
        # If we had an LLM configured, we would synthesize the answer here.
        # For now, we return the raw graph data directly.
        if not self.connected:
            return {
                "answer": "Neo4j is not running. I would normally write a Cypher query to traverse the knowledge graph to answer this.",
                "cypher": cypher,
                "data": graph_data
            }
            
        return {
            "answer": "Here is the data retrieved from the knowledge graph based on your query.",
            "cypher": cypher,
            "data": graph_data
        }

if __name__ == "__main__":
    engine = GraphRAGEngine()
    result = engine.query("Which genes are linked to Alzheimer's?")
    print(json.dumps(result, indent=2))
    engine.close()
