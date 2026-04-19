import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from config import PDF_RENDERER_TIMEOUT_SECONDS, PDF_RENDERER_URL
from database import get_db
from models import AssuntoDB, MateriaDB, PdfRequest, QuestaoGeradaDB

router = APIRouter(tags=["Admin"])


@router.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db)):
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
    except Exception:
        total_materias = total_assuntos = total_questoes = 0
        por_dificuldade = {}

    return {
        "total_materias": total_materias,
        "total_assuntos": total_assuntos,
        "total_questoes": total_questoes,
        "por_dificuldade": por_dificuldade,
    }


@router.post("/export-pdf")
async def export_pdf_endpoint(request: PdfRequest):
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
