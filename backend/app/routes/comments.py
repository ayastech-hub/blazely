from fastapi import APIRouter, HTTPException
from app.db import db
from app.models.comment import CommentModel

router = APIRouter()

@router.post("/", status_code=201)
async def add_comment(comment: CommentModel):
    # ensure token exists
    token = await db.tokens.find_one({"address": comment.token_address.lower()})
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    await db.comments.insert_one(comment.dict())
    return {"message": "Comment added"}

@router.get("/{token_address}")
async def get_comments(token_address: str):
    token_address = token_address.lower()
    comments = await db.comments.find({"token_address": token_address}).sort("timestamp", -1).to_list(100)
    return comments
