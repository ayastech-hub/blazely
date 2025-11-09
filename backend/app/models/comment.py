from pydantic import BaseModel
from datetime import datetime
from pydantic import Field

class CommentModel(BaseModel):
    token_address: str
    user_wallet: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
