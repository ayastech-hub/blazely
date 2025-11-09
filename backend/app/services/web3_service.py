from web3 import Web3
from app.config import WEB3_RPC
w3 = None
if WEB3_RPC:
    w3 = Web3(Web3.HTTPProvider(WEB3_RPC))

# Placeholder helper - in production implement token ABI calls and pagination
async def fetch_top_holders(token_address: str, limit: int = 10):
    # This is a stub. Use etherscan, covalent, or direct on-chain indexer in production.
    return []

async def fetch_recent_transactions(token_address: str, limit: int = 50):
    return []
