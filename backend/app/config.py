import os
from dotenv import load_dotenv
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
WEB3_RPC = os.getenv("WEB3_RPC", "")
JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
