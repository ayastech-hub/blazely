from app.db import db

async def record_purchase(user_wallet: str, token_address: str):
    user_wallet = user_wallet.lower()
    token_address = token_address.lower()
    await db.users.update_one({"wallet_address": user_wallet}, {"$addToSet": {"tokens_bought": token_address}})
