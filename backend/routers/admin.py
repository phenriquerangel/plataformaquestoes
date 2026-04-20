import os

import httpx
from auth import require_admin
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import String, func, text
from sqlalchemy.orm import Session

from config import PDF_RENDERER_TIMEOUT_SECONDS, PDF_RENDERER_URL
from database import get_db
from models import AssuntoDB, EventoLogDB, MateriaDB, PdfRequest, QuestaoGeradaDB

router = APIRouter(tags=["Admin"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "ok"
    db_error = None
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "error"
        db_error = str(e)

    gemini_key = os.getenv("GEMINI_API_KEY", "")
    gemini_status = "ok" if gemini_key else "not_configured"

    overall = "ok" if db_status == "ok" and gemini_status == "ok" else "degraded"

    result = {
        "status": overall,
        "components": {
            "api":      {"status": "ok"},
            "database": {"status": db_status},
            "gemini":   {"status": gemini_status, "key_configured": bool(gemini_key)},
        },
    }
    if db_error:
        result["components"]["database"]["error"] = db_error
    return result


@router.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db), _=Depends(require_admin)):
    try:
        total_materias = db.query(func.count(MateriaDB.id)).scalar()
        total_assuntos = db.query(func.count(AssuntoDB.id)).scalar()
        total_questoes = db.query(func.count(QuestaoGeradaDB.id)).scalar()
        diff_stats = (
            db.query(QuestaoGeradaDB.dificuldade, func.count(QuestaoGeradaDB.id))
            .group_by(QuestaoGeradaDB.dificuldade)
            .all()
        )
        por_dificuldade = {d: c for d, c in diff_stats if d}
        materia_stats = (
            db.query(MateriaDB.nome, func.count(QuestaoGeradaDB.id))
            .join(AssuntoDB, MateriaDB.id == AssuntoDB.materia_id)
            .join(QuestaoGeradaDB, AssuntoDB.id == QuestaoGeradaDB.assunto_id)
            .group_by(MateriaDB.nome)
            .all()
        )
        por_materia = {nome: count for nome, count in materia_stats}
    except Exception:
        total_materias = total_assuntos = total_questoes = 0
        por_dificuldade = {}
        por_materia = {}

    return {
        "total_materias": total_materias,
        "total_assuntos": total_assuntos,
        "total_questoes": total_questoes,
        "por_dificuldade": por_dificuldade,
        "por_materia": por_materia,
    }


@router.get("/admin/logs")
def listar_logs(
    tipo: str = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    query = db.query(EventoLogDB)
    if tipo:
        query = query.filter(EventoLogDB.tipo == tipo)
    total = query.count()
    logs = query.order_by(EventoLogDB.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "logs": [
            {
                "id": l.id,
                "tipo": l.tipo,
                "descricao": l.descricao,
                "extra": l.extra,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ],
        "total": total,
    }


def _enunciado_preview(enunciado, max_len=90):
    if isinstance(enunciado, str):
        return enunciado[:max_len]
    if isinstance(enunciado, list):
        parts = [p.get("content", "") for p in enunciado if isinstance(p, dict) and p.get("type") != "formula"]
        return " ".join(parts)[:max_len]
    return str(enunciado)[:max_len]


@router.get("/admin/questoes")
def listar_questoes_admin(
    materia_id: int = Query(None),
    assunto_id: int = Query(None),
    keyword: str = Query(None),
    dificuldade: str = Query(None),
    limit: int = Query(10),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    query = (
        db.query(QuestaoGeradaDB, AssuntoDB.nome.label("assunto_nome"), MateriaDB.nome.label("materia_nome"))
        .join(AssuntoDB, QuestaoGeradaDB.assunto_id == AssuntoDB.id)
        .join(MateriaDB, AssuntoDB.materia_id == MateriaDB.id)
    )
    if materia_id:
        query = query.filter(MateriaDB.id == materia_id)
    if assunto_id:
        query = query.filter(AssuntoDB.id == assunto_id)
    if dificuldade:
        query = query.filter(QuestaoGeradaDB.dificuldade == dificuldade)
    if keyword:
        query = query.filter(
            QuestaoGeradaDB.enunciado.cast(String).ilike(f"%{keyword}%")
        )

    total = query.count()
    results = query.order_by(QuestaoGeradaDB.id.desc()).offset(offset).limit(limit).all()

    questoes = [
        {
            "id": q.id,
            "enunciado_preview": _enunciado_preview(q.enunciado),
            "dificuldade": q.dificuldade or "—",
            "resposta_correta": q.resposta_correta or "—",
            "assunto_id": q.assunto_id,
            "assunto_nome": assunto_nome,
            "materia_nome": materia_nome,
        }
        for q, assunto_nome, materia_nome in results
    ]
    return {"questoes": questoes, "total": total}


@router.post("/export-pdf")
async def export_pdf_endpoint(request: PdfRequest, _=Depends(require_admin)):
    try:
        async with httpx.AsyncClient(timeout=PDF_RENDERER_TIMEOUT_SECONDS) as client:
            response = await client.post(PDF_RENDERER_URL, json=request.dict())

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail="Erro no serviço de renderização de PDF.",
            )

        return StreamingResponse(iter([response.content]), media_type="application/pdf")

    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Não foi possível conectar ao serviço de PDF: {e}")
