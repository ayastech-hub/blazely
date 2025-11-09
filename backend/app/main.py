from fastapi import FastAPI
from app.routes import tokens, users, comments
from app.db import connect_to_mongo
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Launchpad Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await connect_to_mongo()

app.include_router(tokens.router, prefix="/tokens", tags=["Tokens"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(comments.router, prefix="/comments", tags=["Comments"])
