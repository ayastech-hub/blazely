from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from datetime import datetime

class User(BaseModel):
    id: Optional[str]
    wallet_address: str
    username: Optional[str] = None
    bio: Optional[str] = None
    profile_pic: Optional[HttpUrl] = None
    tokens_created: List[str] = []   # token addresses
    tokens_bought: List[str] = []    # token addresses
    created_at: datetime = datetime.utcnow()
