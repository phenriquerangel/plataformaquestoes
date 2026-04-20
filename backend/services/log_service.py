import asyncio

from database import SessionLocal
from models import EventoLogDB


def registrar_evento(tipo: str, descricao: str, extra: dict = None):
    db = SessionLocal()
    try:
        evento = EventoLogDB(tipo=tipo, descricao=descricao, extra=extra or {})
        db.add(evento)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[log_service] Erro ao registrar evento: {e}")
    finally:
        db.close()


async def registrar_evento_async(tipo: str, descricao: str, extra: dict = None):
    await asyncio.to_thread(registrar_evento, tipo, descricao, extra)
