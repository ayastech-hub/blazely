from fastapi import FastAPI
from app.routes import tokens, users, comments
from app.db import connect_to_mongo

app = FastAPI(title="Launchpad Backend", version="1.0.0")

@app.on_event("startup")
async def startup():
    await connect_to_mongo()

app.include_router(tokens.router, prefix="/tokens", tags=["Tokens"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(comments.router, prefix="/comments", tags=["Comments"])
