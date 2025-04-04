from supabase import create_client, Client
from .config import settings
import logging

logger = logging.getLogger(__name__)

supabase_client: Client | None = None

def get_supabase_client() -> Client:
    """
    Initializes and returns the Supabase client instance.
    Raises an exception if initialization fails.
    """
    global supabase_client
    if supabase_client is None:
        try:
            logger.info(f"Initializing Supabase client for URL: {settings.supabase_url}")
            supabase_client = create_client(settings.supabase_url, settings.supabase_key)
            logger.info("Supabase client initialized successfully.")
            # Optional: Test connection (e.g., fetch user, be mindful of costs/rate limits)
            # test_connection(supabase_client)
        except Exception as e:
            logger.exception("Failed to initialize Supabase client.")
            raise ConnectionError("Could not connect to Supabase.") from e
            
    return supabase_client

def test_connection(client: Client):
    """Helper function to test the Supabase connection."""
    try:
        # Example: Try to get the current user session
        response = client.auth.get_session()
        if response:
             logger.info("Supabase connection test successful (got session).")
        else:
             logger.warning("Supabase connection test completed, but no session returned (might be expected).")
    except Exception as e:
        logger.error(f"Supabase connection test failed: {e}")
        raise

# Example usage (optional, for testing):
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    try:
        client = get_supabase_client()
        print("Supabase client obtained successfully.")
        # You could add more tests here, e.g., fetching data
    except ConnectionError as e:
        print(f"Error: {e}")