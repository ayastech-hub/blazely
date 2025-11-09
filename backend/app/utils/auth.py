# Very simple demonstration of signature auth flow (no production use)
from fastapi import HTTPException
from eth_account.messages import encode_defunct
from eth_account import Account
from app.config import JWT_SECRET
from jose import jwt

def verify_signature(message: str, signature: str, wallet_address: str) -> bool:
    try:
        msg = encode_defunct(text=message)
        signer = Account.recover_message(msg, signature=signature)
        return signer.lower() == wallet_address.lower()
    except Exception:
        return False

def create_jwt(payload: dict) -> str:
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')
