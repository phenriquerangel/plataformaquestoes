import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from database import Base, SessionLocal, engine
from models import AssuntoDB, MateriaDB, UsuarioDB
from routers import admin, assuntos, auth, listas, materias, questoes, usuarios

Base.metadata.create_all(bind=engine)

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE questoes_geradas ADD COLUMN IF NOT EXISTS diagrama JSONB"))
    conn.execute(text("ALTER TABLE questoes_geradas ADD COLUMN IF NOT EXISTS tipo VARCHAR DEFAULT 'multipla_escolha'"))
    conn.execute(text("ALTER TABLE questoes_geradas ADD COLUMN IF NOT EXISTS professor_id INTEGER REFERENCES usuarios(id)"))
    conn.execute(text("ALTER TABLE materias ADD COLUMN IF NOT EXISTS serie VARCHAR"))
    conn.execute(text("ALTER TABLE assuntos ADD COLUMN IF NOT EXISTS serie VARCHAR"))
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

app.include_router(auth.router)
app.include_router(materias.router)
app.include_router(assuntos.router)
app.include_router(questoes.router)
app.include_router(listas.router)
app.include_router(admin.router)
app.include_router(usuarios.router)

# ── Prometheus metrics (/metrics) ────────────────────────────────────────────
from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app)

# ── OpenTelemetry traces (ativo só se OTEL_EXPORTER_OTLP_ENDPOINT estiver set) ─
def _setup_tracing():
    if not os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"):
        return
    from opentelemetry import trace
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

    provider = TracerProvider(resource=Resource.create({"service.name": "eduquest-backend"}))
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(provider)
    FastAPIInstrumentor.instrument_app(app)
    SQLAlchemyInstrumentor().instrument(engine=engine)

_setup_tracing()


@app.get("/")
def read_root():
    return {"status": "ok", "message": "EduQuest.ai API está rodando."}


@app.on_event("startup")
def seed_db():
    from auth import hash_password
    db = SessionLocal()
    try:
        # Seed usuários (migra de env vars para o banco na primeira execução)
        if db.query(UsuarioDB).filter(UsuarioDB.role == "admin").count() == 0:
            admin_un = os.getenv("ADMIN_USERNAME", "admin")
            admin_pw = os.getenv("ADMIN_PASSWORD", "admin123")
            db.add(UsuarioDB(username=admin_un, password_hash=hash_password(admin_pw), role="admin"))
            db.commit()
            print(f"Admin '{admin_un}' criado no banco.")

        user_pw = os.getenv("USER_PASSWORD", "")
        user_un = os.getenv("USER_USERNAME", "professor")
        if user_pw and not db.query(UsuarioDB).filter(UsuarioDB.username == user_un).first():
            db.add(UsuarioDB(username=user_un, password_hash=hash_password(user_pw), role="user"))
            db.commit()
            print(f"Usuário '{user_un}' criado no banco.")

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
