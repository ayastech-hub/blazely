from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from datetime import datetime
from pydantic import Field

class UserModel(BaseModel):
    wallet_address: str
    username: Optional[str] = None
    bio: Optional[str] = None
    profile_pic: Optional[HttpUrl] = None
    tokens_created: List[str] = []
    tokens_bought: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
