from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import AssuntoDB, AssuntoCreate

router = APIRouter(prefix="/assuntos", tags=["Assuntos"])


@router.get("/{materia_id}")
def listar_assuntos(materia_id: int, db: Session = Depends(get_db)):
    return db.query(AssuntoDB).filter(AssuntoDB.materia_id == materia_id).all()


@router.post("")
def criar_assunto(assunto: AssuntoCreate, db: Session = Depends(get_db)):
    try:
        db_assunto = AssuntoDB(nome=assunto.nome, materia_id=assunto.materia_id)
        db.add(db_assunto)
        db.commit()
        db.refresh(db_assunto)
        return db_assunto
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erro ao criar assunto: {e}")


@router.put("/{assunto_id}")
def editar_assunto(assunto_id: int, assunto: AssuntoCreate, db: Session = Depends(get_db)):
    db_assunto = db.query(AssuntoDB).filter(AssuntoDB.id == assunto_id).first()
    if not db_assunto:
        raise HTTPException(status_code=404, detail="Assunto não encontrado")
    try:
        db_assunto.nome = assunto.nome
        db_assunto.materia_id = assunto.materia_id
        db.commit()
        db.refresh(db_assunto)
        return db_assunto
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erro ao editar assunto: {e}")


@router.delete("/{assunto_id}")
def excluir_assunto(assunto_id: int, db: Session = Depends(get_db)):
    assunto = db.query(AssuntoDB).filter(AssuntoDB.id == assunto_id).first()
    if not assunto:
        raise HTTPException(status_code=404, detail="Assunto não encontrado")
    try:
        db.delete(assunto)
        db.commit()
        return {"message": "Assunto e questões vinculadas excluídos"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erro ao excluir assunto: {e}")
