from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGO_URI

db = None

async def connect_to_mongo():
    global db
    client = AsyncIOMotorClient(MONGO_URI)
    db = client["launchpad_db"]
    # create some indexes
    await db.users.create_index("wallet_address", unique=True)
    await db.tokens.create_index("address", unique=True)
    print("Connected to MongoDB")
