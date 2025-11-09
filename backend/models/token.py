from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional
from datetime import datetime

class Token(BaseModel):
    id: Optional[str]
    address: str
    name: str
    symbol: str
    description: Optional[str]
    category: Optional[str]
    logo_url: Optional[HttpUrl]
    socials: Optional[dict] = {
        "telegram": None,
        "twitter": None,
        "website": None
    }
    creator_wallet: str
    holders: List[dict] = []  # [{address, amount}]
    recent_transactions: List[dict] = []  # [{hash, type, amount, timestamp}]
    buy_volume: float = 0
    sell_volume: float = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
