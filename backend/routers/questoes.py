import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import String
from sqlalchemy.orm import Session

from config import QUERY_DEFAULT_LIMIT
from database import get_db
from models import GenerateRequest, Question, QuestaoGeradaDB, QuestionListResponse
from services.question_service import generate_and_stream

router = APIRouter(tags=["Questões"])


@router.get("/questoes-salvas", response_model=QuestionListResponse)
def listar_questoes_salvas(
    assunto_ids: List[int] = Query(None),
    questao_id: int = Query(None),
    keyword: str = Query(None),
    dificuldade: str = Query(None),
    limit: int = Query(QUERY_DEFAULT_LIMIT),
    offset: int = Query(0),
    ordem: str = Query("desc"),
    db: Session = Depends(get_db),
):
    query = db.query(QuestaoGeradaDB)

    if questao_id:
        query = query.filter(QuestaoGeradaDB.id == questao_id)
    else:
        if assunto_ids:
            query = query.filter(QuestaoGeradaDB.assunto_id.in_(assunto_ids))
        if keyword:
            query = query.filter(
                (QuestaoGeradaDB.enunciado.cast(String).ilike(f"%{keyword}%"))
                | (QuestaoGeradaDB.explicacao.cast(String).ilike(f"%{keyword}%"))
            )
        if dificuldade:
            query = query.filter(QuestaoGeradaDB.dificuldade == dificuldade)

    total = query.count()
    query = query.order_by(
        QuestaoGeradaDB.id.asc() if ordem == "asc" else QuestaoGeradaDB.id.desc()
    )
    questoes = query.offset(offset).limit(limit).all()

    parsed = []
    for q in questoes:
        if isinstance(q.alternativas, list):
            alts = q.alternativas
        elif isinstance(q.alternativas, str):
            try:
                alts = json.loads(q.alternativas)
            except (json.JSONDecodeError, TypeError):
                alts = []
        else:
            alts = []

        parsed.append(
            Question(
                id=q.id,
                enunciado=q.enunciado,
                diagrama_svg=q.diagrama_svg,
                alternativas=alts,
                resposta_correta=q.resposta_correta or "Não informada",
                explicacao=q.explicacao,
                dificuldade=q.dificuldade,
            )
        )

    return {"questoes": parsed, "total": total}


@router.delete("/questoes/{questao_id}")
def excluir_questao(questao_id: int, db: Session = Depends(get_db)):
    questao = db.query(QuestaoGeradaDB).filter(QuestaoGeradaDB.id == questao_id).first()
    if not questao:
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    try:
        db.delete(questao)
        db.commit()
        return {"message": "Questão excluída com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erro ao excluir questão: {e}")


@router.post("/generate")
async def generate_questions_stream(request: GenerateRequest, db: Session = Depends(get_db)):
    return StreamingResponse(generate_and_stream(request, db), media_type="application/x-ndjson")
