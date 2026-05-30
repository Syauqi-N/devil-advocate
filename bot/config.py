import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
KIRO_API_KEY = os.getenv("KIRO_API_KEY", "kiro-local-secret")
KIRO_BASE_URL = os.getenv("KIRO_BASE_URL", "http://localhost:8000/v1")
MODEL = os.getenv("MODEL", "claude-sonnet-4.6")
MAX_DEBATES_FREE = int(os.getenv("MAX_DEBATES_FREE", "5"))
DB_PATH = os.getenv("DB_PATH", "debates.db")
