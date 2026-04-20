from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user, require_admin
from database import get_db
from models import MateriaDB, MateriaCreate
from services.log_service import registrar_evento

router = APIRouter(prefix="/materias", tags=["Matérias"])


@router.get("")
def listar_materias(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(MateriaDB).all()


@router.post("")
def criar_materia(materia: MateriaCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(MateriaDB).filter(MateriaDB.nome == materia.nome).first():
        raise HTTPException(status_code=409, detail="Matéria com este nome já existe.")
    try:
        db_materia = MateriaDB(nome=materia.nome)
        db.add(db_materia)
        db.commit()
        db.refresh(db_materia)
        registrar_evento("criacao_materia", f"Matéria '{db_materia.nome}' criada", {"materia_id": db_materia.id, "nome": db_materia.nome})
        return db_materia
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erro ao criar matéria: {e}")


@router.put("/{materia_id}")
def editar_materia(materia_id: int, materia: MateriaCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    db_materia = db.query(MateriaDB).filter(MateriaDB.id == materia_id).first()
    if not db_materia:
        raise HTTPException(status_code=404, detail="Matéria não encontrada")
    try:
        db_materia.nome = materia.nome
        db.commit()
        db.refresh(db_materia)
        return db_materia
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erro ao editar matéria: {e}")


@router.delete("/{materia_id}")
def excluir_materia(materia_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    materia = db.query(MateriaDB).filter(MateriaDB.id == materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Matéria não encontrada")
    try:
        nome = materia.nome
        db.delete(materia)
        db.commit()
        registrar_evento("exclusao_materia", f"Matéria '{nome}' excluída", {"materia_id": materia_id, "nome": nome})
        return {"message": "Matéria e conteúdos vinculados excluídos"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erro ao excluir matéria: {e}")
