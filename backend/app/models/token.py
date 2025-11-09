from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class Holder(BaseModel):
    address: str
    amount: float

class Transaction(BaseModel):
    tx_hash: str
    from_address: str
    to_address: str
    amount: float
    type: Optional[str] = None  # buy/sell/transfer
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class TokenModel(BaseModel):
    address: str
    name: str
    symbol: str
    description: Optional[str] = None
    category: Optional[str] = None
    logo_url: Optional[HttpUrl] = None
    socials: Optional[Dict[str, Optional[str]]] = {"telegram": None, "twitter": None, "website": None}
    creator_wallet: str
    holders: List[Holder] = []
    recent_transactions: List[Transaction] = []
    buy_volume: float = 0.0
    sell_volume: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
