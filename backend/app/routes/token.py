from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.db import db
from app.models.token import TokenModel
from typing import Optional
from app.utils.file_upload import save_logo_file

router = APIRouter()

@router.post("/", status_code=201)
async def create_token(
    address: str = Form(...),
    name: str = Form(...),
    symbol: str = Form(...),
    creator_wallet: str = Form(...),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    telegram: Optional[str] = Form(None),
    twitter: Optional[str] = Form(None),
    website: Optional[str] = Form(None),
    logo: Optional[UploadFile] = File(None),
):
    address = address.lower()
    existing = await db.tokens.find_one({"address": address})
    if existing:
        raise HTTPException(status_code=400, detail="Token already exists")
    logo_url = None
    if logo:
        logo_url = await save_logo_file(logo)
    token = {
        "address": address,
        "name": name,
        "symbol": symbol,
        "description": description,
        "category": category,
        "logo_url": logo_url,
        "socials": {"telegram": telegram, "twitter": twitter, "website": website},
        "creator_wallet": creator_wallet.lower(),
        "holders": [],
        "recent_transactions": [],
        "buy_volume": 0.0,
        "sell_volume": 0.0
    }
    await db.tokens.insert_one(token)
    # add token to creator profile if exists
    await db.users.update_one({"wallet_address": creator_wallet.lower()}, {"$addToSet": {"tokens_created": address}})
    return {"message": "Token created", "token": token}

@router.get("/{address}")
async def get_token(address: str):
    address = address.lower()
    token = await db.tokens.find_one({"address": address})
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    # compute top holders (sorted)
    holders = sorted(token.get("holders", []), key=lambda h: h.get("amount", 0), reverse=True)[:10]
    token["top_holders"] = holders
    # recent transactions
    token["recent_transactions"] = sorted(token.get("recent_transactions", []), key=lambda t: t.get("timestamp", ""), reverse=True)[:50]
    return token

@router.put("/{address}")
async def update_token(address: str, updates: dict):
    address = address.lower()
    result = await db.tokens.update_one({"address": address}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Token not found")
    return {"message": "Token updated"}
