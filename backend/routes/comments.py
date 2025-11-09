from fastapi import APIRouter
from app.db import db
from app.models.comment import Comment

router = APIRouter()

@router.post("/")
async def add_comment(comment: Comment):
    await db.comments.insert_one(comment.dict())
    return {"message": "Comment added"}

@router.get("/{token_address}")
async def get_comments(token_address: str):
    comments = await db.comments.find({"token_address": token_address}).to_list(100)
    return comments
