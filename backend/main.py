from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from database import Base, SessionLocal, engine
from models import AssuntoDB, MateriaDB
from routers import admin, assuntos, materias, questoes

Base.metadata.create_all(bind=engine)

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE questoes_geradas ADD COLUMN IF NOT EXISTS diagrama JSONB"))
    conn.commit()

app = FastAPI(
    title="EduQuest.ai API",
    description="API para gestão e geração de questões educacionais com IA.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(materias.router)
app.include_router(assuntos.router)
app.include_router(questoes.router)
app.include_router(admin.router)


@app.get("/")
def read_root():
    return {"status": "ok", "message": "EduQuest.ai API está rodando."}


@app.on_event("startup")
def seed_db():
    db = SessionLocal()
    try:
        if db.query(MateriaDB).count() == 0:
            historia = MateriaDB(nome="História")
            matematica = MateriaDB(nome="Matemática")
            db.add_all([historia, matematica])
            db.commit()
            db.refresh(historia)
            db.refresh(matematica)
            db.add_all([
                AssuntoDB(nome="Revolução Francesa", materia_id=historia.id),
                AssuntoDB(nome="Segunda Guerra Mundial", materia_id=historia.id),
                AssuntoDB(nome="Equações do 2º Grau", materia_id=matematica.id),
            ])
            db.commit()
            print("Dados iniciais inseridos.")
        else:
            print("Banco já populado, seed ignorado.")
    except Exception as e:
        print(f"Erro no seed: {e}")
    finally:
        db.close()
