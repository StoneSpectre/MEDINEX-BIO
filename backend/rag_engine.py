from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings, Document
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.openai import OpenAI
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.postprocessor import SimilarityPostprocessor
import os
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

class RAGEngine:
    def __init__(self, use_llm=False):
        # Configure biomedical embedding + LLM
        Settings.embed_model = HuggingFaceEmbedding(
            model_name="microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract"
        )
        
        # We only init OpenAI if the API key is present and use_llm is true
        if use_llm and os.getenv("OPENAI_API_KEY"):
            Settings.llm = OpenAI(model="gpt-4o", temperature=0)
        else:
            Settings.llm = None
            
        self.index = None
        self.engine = None

    def build_index_from_csv(self, csv_path="combined_dataset.csv"):
        if not os.path.exists(csv_path):
            print("CSV dataset not found.")
            return

        print("Loading documents for RAG...")
        df = pd.read_csv(csv_path)
        docs = []
        for _, row in df.iterrows():
            text = row.get("Abstract", "")
            if isinstance(text, str) and text.strip():
                docs.append(Document(
                    text=text,
                    metadata={"pmid": str(row.get("PMID", "")), "title": row.get("Title", "")}
                ))
                
        splitter = SentenceSplitter(chunk_size=512, chunk_overlap=64)
        
        print(f"Building vector index for {len(docs)} documents...")
        self.index = VectorStoreIndex.from_documents(
            docs,
            transformations=[splitter],
            show_progress=True,
        )
        
        # Build retrieval query engine
        retriever = VectorIndexRetriever(index=self.index, similarity_top_k=5)
        self.engine = RetrieverQueryEngine(
            retriever=retriever,
            node_postprocessors=[SimilarityPostprocessor(similarity_cutoff=0.6)],
        )
        print("RAG Index Built Successfully.")

    def query(self, question: str):
        if not self.engine:
            return "Engine not initialized."
            
        if not Settings.llm:
            # Without LLM, we just retrieve
            nodes = self.engine.retriever.retrieve(question)
            return {
                "answer": "LLM not configured. Here are the top retrieved passages.",
                "sources": [{"score": n.score, "text": n.node.text[:200], "metadata": n.node.metadata} for n in nodes]
            }
            
        response = self.engine.query(question)
        return {
            "answer": str(response),
            "sources": [{"score": n.score, "metadata": n.node.metadata} for n in response.source_nodes]
        }

if __name__ == "__main__":
    rag = RAGEngine(use_llm=False)
    rag.build_index_from_csv()
    print(rag.query("What are the known genetic risk factors for Alzheimer's disease?"))
