import os
import fitz  # PyMuPDF
from llama_index.core import VectorStoreIndex, Document, Settings, StorageContext
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

# Config
PDF_PATH = "data/robbins_basic_pathology.pdf"
STORAGE_DIR = "backend/storage"
MAX_PAGES = 50  # Limit to first 50 pages for faster testing. Set to None to embed the whole book.

def extract_text_from_pdf(pdf_path, max_pages=None):
    if not os.path.exists(pdf_path):
        print(f"Error: {pdf_path} not found.")
        return []
    
    print(f"Extracting text from {pdf_path}...")
    doc = fitz.open(pdf_path)
    documents = []
    
    total_pages = min(len(doc), max_pages) if max_pages else len(doc)
    
    for i in range(total_pages):
        page = doc.load_page(i)
        text = page.get_text("text")
        
        # Clean up text a bit
        text = " ".join(text.split())
        
        if text.strip():
            documents.append(Document(
                text=text,
                metadata={"source": "Robbins Basic Pathology", "page": i + 1}
            ))
            
    print(f"Extracted {len(documents)} pages of text.")
    return documents

def main():
    # 1. Setup embedding model to match rag_engine.py
    print("Loading Biomedical Embedding Model...")
    Settings.embed_model = HuggingFaceEmbedding(
        model_name="microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract"
    )
    Settings.llm = None  # We don't need LLM just for ingestion
    
    # 2. Extract text
    docs = extract_text_from_pdf(PDF_PATH, MAX_PAGES)
    if not docs:
        return
        
    # 3. Create Index and Persist to Disk
    splitter = SentenceSplitter(chunk_size=512, chunk_overlap=64)
    print("Building Vector Index... This may take a while depending on MAX_PAGES.")
    
    index = VectorStoreIndex.from_documents(
        docs,
        transformations=[splitter],
        show_progress=True
    )
    
    print(f"Persisting index to {STORAGE_DIR}...")
    index.storage_context.persist(persist_dir=STORAGE_DIR)
    print("Ingestion complete! You can now run api.py which will load this from disk instantly.")

if __name__ == "__main__":
    main()
