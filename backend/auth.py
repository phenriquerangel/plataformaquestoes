import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, Header, HTTPException
from jose import JWTError, jwt
import bcrypt

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "eduquest-dev-secret-change-in-prod")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 8


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def authenticate(username: str, password: str) -> Optional[dict]:
    from database import SessionLocal
    from models import UsuarioDB
    db = SessionLocal()
    try:
        user = db.query(UsuarioDB).filter(
            UsuarioDB.username == username,
            UsuarioDB.ativo == True,
        ).first()
        if not user or not verify_password(password, user.password_hash):
            return None
        return {"username": user.username, "role": user.role}
    finally:
        db.close()


def create_token(username: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": username, "role": role, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def get_current_user(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token ausente")
    try:
        payload = jwt.decode(authorization[7:], SECRET_KEY, algorithms=[ALGORITHM])
        return {"username": payload["sub"], "role": payload["role"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return user
