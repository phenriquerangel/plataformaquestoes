import json
from typing import List

from auth import get_current_user
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import String, func
from sqlalchemy.orm import Session

from config import QUERY_DEFAULT_LIMIT
from database import get_db
from models import GenerateRequest, Question, QuestaoGeradaDB, ListaQuestaoAssociation, QuestionListResponse, QuestionUpdate
from services.log_service import registrar_evento
from services.question_service import generate_and_stream

router = APIRouter(tags=["Questões"])


@router.get("/questoes-salvas", response_model=QuestionListResponse)
def listar_questoes_salvas(
    assunto_ids: List[int] = Query(None),
    questao_id: int = Query(None),
    keyword: str = Query(None),
    dificuldade: str = Query(None),
    tipo: str = Query(None),
    tag: str = Query(None),
    limit: int = Query(QUERY_DEFAULT_LIMIT),
    offset: int = Query(0),
    ordem: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Subquery para contar quantas listas cada questão está
    uso_subq = (
        db.query(
            ListaQuestaoAssociation.questao_id,
            func.count(ListaQuestaoAssociation.lista_id).label("vezes_usada"),
        )
        .group_by(ListaQuestaoAssociation.questao_id)
        .subquery()
    )

    query = db.query(QuestaoGeradaDB, func.coalesce(uso_subq.c.vezes_usada, 0).label("vezes_usada")).outerjoin(
        uso_subq, QuestaoGeradaDB.id == uso_subq.c.questao_id
    )

    if current_user["role"] != "admin":
        query = query.filter(QuestaoGeradaDB.professor_id == current_user["id"])

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
        if tipo:
            query = query.filter(QuestaoGeradaDB.tipo == tipo)
        if tag:
            query = query.filter(QuestaoGeradaDB.tags.cast(String).ilike(f"%{tag}%"))

    total = query.count()
    query = query.order_by(
        QuestaoGeradaDB.id.asc() if ordem == "asc" else QuestaoGeradaDB.id.desc()
    )
    rows = query.offset(offset).limit(limit).all()

    parsed = []
    for q, vezes_usada in rows:
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
                diagrama=q.diagrama,
                alternativas=alts,
                resposta_correta=q.resposta_correta or "",
                explicacao=q.explicacao,
                dificuldade=q.dificuldade,
                tipo=q.tipo or "multipla_escolha",
                tags=q.tags or [],
                vezes_usada=vezes_usada,
            )
        )

    return {"questoes": parsed, "total": total}


@router.put("/questoes/{questao_id}")
def atualizar_questao(questao_id: int, body: QuestionUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    questao = db.query(QuestaoGeradaDB).filter(QuestaoGeradaDB.id == questao_id).first()
    if not questao:
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    if current_user["role"] != "admin" and questao.professor_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    if body.dificuldade is not None:
        questao.dificuldade = body.dificuldade
    if body.resposta_correta is not None:
        questao.resposta_correta = body.resposta_correta
    if body.enunciado is not None:
        questao.enunciado = body.enunciado
    if body.alternativas is not None:
        questao.alternativas = body.alternativas
    if body.explicacao is not None:
        questao.explicacao = body.explicacao
    if body.tags is not None:
        questao.tags = body.tags
    db.commit()
    return {"message": "Questão atualizada com sucesso"}


@router.delete("/questoes/{questao_id}")
def excluir_questao(questao_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    questao = db.query(QuestaoGeradaDB).filter(QuestaoGeradaDB.id == questao_id).first()
    if not questao:
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    if current_user["role"] != "admin" and questao.professor_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    try:
        assunto_id = questao.assunto_id
        db.delete(questao)
        db.commit()
        registrar_evento("exclusao_questao", f"Questão #{questao_id} excluída", {"questao_id": questao_id, "assunto_id": assunto_id})
        return {"message": "Questão excluída com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erro ao excluir questão: {e}")


@router.post("/generate")
async def generate_questions_stream(request: GenerateRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return StreamingResponse(
        generate_and_stream(request, db, professor_id=current_user["id"]),
        media_type="application/x-ndjson",
    )
