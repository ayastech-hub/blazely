from app.db import db
from app.services.web3_service import fetch_top_holders, fetch_recent_transactions

async def index_token_onchain(address: str):
    # fetch holders and recent txs, then update token doc
    holders = await fetch_top_holders(address)
    txs = await fetch_recent_transactions(address)
    await db.tokens.update_one({"address": address}, {"$set": {"holders": holders, "recent_transactions": txs}})
