from fastapi import APIRouter, HTTPException
from app.db import db
from app.models.user import UserModel
from pydantic import BaseModel
router = APIRouter()

class ConnectBody(BaseModel):
    wallet_address: str

@router.post("/connect")
async def connect_wallet(body: ConnectBody):
    wallet = body.wallet_address.lower()
    user = await db.users.find_one({"wallet_address": wallet})
    if user:
        return user
    new_user = {
        "wallet_address": wallet,
        "username": wallet,
        "bio": "",
        "profile_pic": None,
        "tokens_created": [],
        "tokens_bought": []
    }
    await db.users.insert_one(new_user)
    return new_user

@router.get("/{wallet}")
async def get_profile(wallet: str):
    wallet = wallet.lower()
    user = await db.users.find_one({"wallet_address": wallet})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # populate tokens created/bought details (small projection)
    created = await db.tokens.find({"address": {"$in": user.get("tokens_created", [])}}).to_list(50)
    bought = await db.tokens.find({"address": {"$in": user.get("tokens_bought", [])}}).to_list(50)
    user["tokens_created_details"] = created
    user["tokens_bought_details"] = bought
    return user

@router.put("/{wallet}")
async def update_profile(wallet: str, updates: dict):
    wallet = wallet.lower()
    result = await db.users.update_one({"wallet_address": wallet}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Profile updated"}
