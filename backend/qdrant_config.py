from qdrant_client import QdrantClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize Qdrant Cloud client
qdrant_client = None

def get_qdrant_client():
    """Get or create Qdrant client instance"""
    global qdrant_client
    if qdrant_client is None:
        url = os.getenv("QDRANT_URL")
        api_key = os.getenv("QDRANT_API_KEY")
        
        if not url or not api_key:
            raise ValueError("QDRANT_URL and QDRANT_API_KEY must be set in environment variables")
        
        qdrant_client = QdrantClient(
            url=url,
            api_key=api_key,
        )
        
        # Test connection
        try:
            collections = qdrant_client.get_collections()
        except Exception as e:
            raise
    
    return qdrant_client

# Initialize on module import
if __name__ == "__main__":
    client = get_qdrant_client()
