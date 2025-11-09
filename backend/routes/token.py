from fastapi import APIRouter, HTTPException
from app.db import db
from app.models.token import Token

router = APIRouter()

@router.post("/")
async def create_token(token: Token):
    existing = await db.tokens.find_one({"address": token.address})
    if existing:
        raise HTTPException(status_code=400, detail="Token already exists.")
    await db.tokens.insert_one(token.dict())
    return {"message": "Token created successfully"}

@router.get("/{address}")
async def get_token(address: str):
    token = await db.tokens.find_one({"address": address})
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    return token

@router.put("/{address}")
async def update_token(address: str, updates: dict):
    result = await db.tokens.update_one({"address": address}, {"$set": updates})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Token not found or no update")
    return {"message": "Token updated successfully"}
