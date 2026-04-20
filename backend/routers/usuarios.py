from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import hash_password, require_admin
from database import get_db
from models import UsuarioDB, UsuarioCreate, UsuarioUpdate
from services.log_service import registrar_evento

router = APIRouter(prefix="/admin/usuarios", tags=["Usuários"])


def _serialize(u: UsuarioDB) -> dict:
    return {
        "id": u.id,
        "username": u.username,
        "role": u.role,
        "ativo": u.ativo,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


@router.get("")
def listar_usuarios(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return [_serialize(u) for u in db.query(UsuarioDB).order_by(UsuarioDB.id).all()]


@router.post("", status_code=201)
def criar_usuario(body: UsuarioCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    if db.query(UsuarioDB).filter(UsuarioDB.username == body.username).first():
        raise HTTPException(400, "Nome de usuário já existe")
    u = UsuarioDB(username=body.username, password_hash=hash_password(body.password), role=body.role)
    db.add(u)
    db.commit()
    db.refresh(u)
    registrar_evento(
        "criacao_usuario",
        f"Usuário '{u.username}' criado ({u.role})",
        {"username": u.username, "role": u.role, "criado_por": admin["username"]},
    )
    return _serialize(u)


@router.put("/{usuario_id}")
def atualizar_usuario(usuario_id: int, body: UsuarioUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(UsuarioDB).filter(UsuarioDB.id == usuario_id).first()
    if not u:
        raise HTTPException(404, "Usuário não encontrado")

    changes = []

    if body.role is not None and body.role != u.role:
        admins_ativos = db.query(UsuarioDB).filter(UsuarioDB.role == "admin", UsuarioDB.ativo == True).count()
        if u.role == "admin" and admins_ativos == 1:
            raise HTTPException(400, "Não é possível alterar o papel do único administrador ativo")
        u.role = body.role
        changes.append(f"role→{body.role}")

    if body.password:
        u.password_hash = hash_password(body.password)
        changes.append("senha redefinida")

    if body.ativo is not None and body.ativo != u.ativo:
        if not body.ativo and u.username == admin["username"]:
            raise HTTPException(400, "Não é possível desativar sua própria conta")
        u.ativo = body.ativo
        changes.append(f"ativo→{body.ativo}")

    db.commit()
    if changes:
        registrar_evento(
            "edicao_usuario",
            f"Usuário '{u.username}' editado: {', '.join(changes)}",
            {"username": u.username, "changes": changes, "editado_por": admin["username"]},
        )
    return _serialize(u)


@router.delete("/{usuario_id}")
def excluir_usuario(usuario_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(UsuarioDB).filter(UsuarioDB.id == usuario_id).first()
    if not u:
        raise HTTPException(404, "Usuário não encontrado")
    if u.username == admin["username"]:
        raise HTTPException(400, "Não é possível excluir sua própria conta")
    admins_ativos = db.query(UsuarioDB).filter(UsuarioDB.role == "admin", UsuarioDB.ativo == True).count()
    if u.role == "admin" and admins_ativos == 1:
        raise HTTPException(400, "Não é possível excluir o único administrador")

    nome = u.username
    db.delete(u)
    db.commit()
    registrar_evento(
        "exclusao_usuario",
        f"Usuário '{nome}' excluído",
        {"username": nome, "excluido_por": admin["username"]},
    )
    return {"message": "Usuário excluído"}
