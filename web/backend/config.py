import os
from dotenv import load_dotenv

load_dotenv()

LLM_API_KEY = os.getenv("LLM_API_KEY", "kiro-local-secret")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://localhost:20128/v1")
MODEL = os.getenv("MODEL", "hermes2")

DB_PATH = os.getenv("DB_PATH", "/opt/devil-advocate-web/backend/debates.db")

NEXTAUTH_SECRET = os.getenv("NEXTAUTH_SECRET", "")

MAX_DEBATES_FREE = int(os.getenv("MAX_DEBATES_FREE", "1"))
MAX_MARKETING_FREE = int(os.getenv("MAX_MARKETING_FREE", "1"))

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# Pakasir
PAKASIR_PROJECT_SLUG = os.getenv("PAKASIR_PROJECT_SLUG", "")
PAKASIR_API_KEY = os.getenv("PAKASIR_API_KEY", "")
PAKASIR_CALLBACK_URL = os.getenv("PAKASIR_CALLBACK_URL", "https://debate.soqisoqi.my.id/api/subscription/webhook")
PAKASIR_SUCCESS_URL = os.getenv("PAKASIR_SUCCESS_URL", "https://debate.soqisoqi.my.id/pricing?status=success")
