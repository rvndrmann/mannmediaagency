import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import Field

# Load environment variables from .env file in the backend directory
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=dotenv_path)

class Settings(BaseSettings):
    # Supabase
    supabase_url: str = Field(..., env="SUPABASE_URL")
    supabase_key: str = Field(..., env="SUPABASE_KEY")

    # OpenAI
    openai_api_key: str = Field(..., env="OPENAI_API_KEY")
    openai_assistant_id: str = Field(..., env="OPENAI_ASSISTANT_ID")

    # Server Config (Optional with defaults)
    host: str = Field(default="127.0.0.1", env="HOST")
    port: int = Field(default=8000, env="PORT")

    class Config:
        env_file = dotenv_path
        case_sensitive = True # Important for environment variable names

# Create a single instance of the settings
settings = Settings()

# Example usage (optional, for testing):
if __name__ == "__main__":
    print("Loaded Settings:")
    print(f"  Supabase URL: {settings.supabase_url}")
    # Avoid printing keys directly in logs for security
    print(f"  Supabase Key Loaded: {'Yes' if settings.supabase_key else 'No'}")
    print(f"  OpenAI Key Loaded: {'Yes' if settings.openai_api_key else 'No'}")
    print(f"  OpenAI Assistant ID: {settings.openai_assistant_id}")
    print(f"  Host: {settings.host}")
    print(f"  Port: {settings.port}")