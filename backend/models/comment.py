from pydantic import BaseModel
from datetime import datetime

class Comment(BaseModel):
    id: Optional[str]
    token_address: str
    user_wallet: str
    content: str
    timestamp: datetime = datetime.utcnow()
