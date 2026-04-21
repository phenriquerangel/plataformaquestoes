from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth import get_current_user, require_admin
from database import get_db
from models import AssuntoDB, AssuntoCreate, SerieDB
from services.log_service import registrar_evento

router = APIRouter(prefix="/assuntos", tags=["Assuntos"])


@router.get("/{materia_id}")
def listar_assuntos(
    materia_id: int,
    serie_nome: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(AssuntoDB).filter(AssuntoDB.materia_id == materia_id)
    if serie_nome:
        serie = db.query(SerieDB).filter(SerieDB.nome == serie_nome).first()
        if serie:
            query = query.filter(AssuntoDB.serie_id == serie.id)
    return query.all()


@router.post("")
def criar_assunto(assunto: AssuntoCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    try:
        serie_id = None
        if assunto.serie:
            serie_obj = db.query(SerieDB).filter(SerieDB.nome == assunto.serie).first()
            if serie_obj:
                serie_id = serie_obj.id
        db_assunto = AssuntoDB(nome=assunto.nome, materia_id=assunto.materia_id, serie=assunto.serie, serie_id=serie_id)
        db.add(db_assunto)
        db.commit()
        db.refresh(db_assunto)
        registrar_evento("criacao_assunto", f"Assunto '{db_assunto.nome}' criado", {"assunto_id": db_assunto.id, "nome": db_assunto.nome, "materia_id": db_assunto.materia_id})
        return db_assunto
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erro ao criar assunto: {e}")


@router.put("/{assunto_id}")
def editar_assunto(assunto_id: int, assunto: AssuntoCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    db_assunto = db.query(AssuntoDB).filter(AssuntoDB.id == assunto_id).first()
    if not db_assunto:
        raise HTTPException(status_code=404, detail="Assunto não encontrado")
    try:
        serie_id = None
        if assunto.serie:
            serie_obj = db.query(SerieDB).filter(SerieDB.nome == assunto.serie).first()
            if serie_obj:
                serie_id = serie_obj.id
        db_assunto.nome = assunto.nome
        db_assunto.materia_id = assunto.materia_id
        db_assunto.serie = assunto.serie
        db_assunto.serie_id = serie_id
        db.commit()
        db.refresh(db_assunto)
        return db_assunto
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erro ao editar assunto: {e}")


@router.delete("/{assunto_id}")
def excluir_assunto(assunto_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    assunto = db.query(AssuntoDB).filter(AssuntoDB.id == assunto_id).first()
    if not assunto:
        raise HTTPException(status_code=404, detail="Assunto não encontrado")
    try:
        nome = assunto.nome
        db.delete(assunto)
        db.commit()
        registrar_evento("exclusao_assunto", f"Assunto '{nome}' excluído", {"assunto_id": assunto_id, "nome": nome})
        return {"message": "Assunto e questões vinculadas excluídos"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erro ao excluir assunto: {e}")
