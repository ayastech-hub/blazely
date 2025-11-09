import os
from fastapi import UploadFile
from pathlib import Path
UPLOAD_DIR = Path('/mnt/data/launchpad-backend/uploads')
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

async def save_logo_file(upload: UploadFile) -> str:
    # simple local save - replace this with S3 or IPFS in production
    filename = f"{upload.filename}"
    dest = UPLOAD_DIR / filename
    contents = await upload.read()
    with open(dest, 'wb') as f:
        f.write(contents)
    return f"/uploads/{filename}"
