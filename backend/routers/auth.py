from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from auth import authenticate, create_token
from services.log_service import registrar_evento

router = APIRouter(tags=["Auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/auth/login")
def login(req: LoginRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    user = authenticate(req.username, req.password)
    if not user:
        registrar_evento(
            "login_falha",
            f"Tentativa de login malsucedida para '{req.username}'",
            {"username": req.username, "ip": ip},
        )
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")

    registrar_evento(
        "login_sucesso",
        f"Login realizado: {user['username']} ({user['role']})",
        {"username": user["username"], "role": user["role"], "ip": ip},
    )
    return {
        "access_token": create_token(user["username"], user["role"]),
        "token_type": "bearer",
        "role": user["role"],
        "username": user["username"],
    }
