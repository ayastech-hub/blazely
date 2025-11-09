from fastapi import APIRouter
from app.db import db
from app.models.user import User

router = APIRouter()

@router.post("/connect")
async def connect_wallet(wallet_address: str):
    user = await db.users.find_one({"wallet_address": wallet_address})
    if user:
        return user
    new_user = User(wallet_address=wallet_address)
    await db.users.insert_one(new_user.dict())
    return new_user

@router.put("/{wallet}")
async def update_profile(wallet: str, updates: dict):
    await db.users.update_one({"wallet_address": wallet}, {"$set": updates})
    return {"message": "Profile updated"}
