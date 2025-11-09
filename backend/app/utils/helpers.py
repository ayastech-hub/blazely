from typing import Any
def safe_get(d: dict, key: str, default=None):
    return d.get(key, default) if isinstance(d, dict) else default
