from motor.motor_asyncio import AsyncIOMotorClient

db = None

async def connect_to_mongo():
    global db
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["launchpad_db"]
