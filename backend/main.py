import os
import json
from fastapi import FastAPI, HTTPException, Depends, Query, APIRouter
from fastapi.responses import StreamingResponse
import re
import html
import asyncio
import random
import httpx
import google.api_core.exceptions
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Union
import google.generativeai as genai
from sqlalchemy import Column, Integer, String, ForeignKey, create_engine, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship

app = FastAPI(
    title="EduQuest.ai API",
    description="API para gestão e geração de questões educacionais com IA.",
    version="1.0.0",
    docs_url="/docs",  # Endpoint do Swagger UI
    redoc_url="/redoc" # Endpoint do ReDoc
)

# Configuração do Banco de Dados
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:admin123@postgres-service:5432/questoesdb")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Modelos do Banco
class MateriaDB(Base):
    __tablename__ = "materias"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, index=True)
    assuntos = relationship("AssuntoDB", back_populates="materia", cascade="all, delete-orphan")

class AssuntoDB(Base):
    __tablename__ = "assuntos"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String)
    materia_id = Column(Integer, ForeignKey("materias.id"))
    materia = relationship("MateriaDB", back_populates="assuntos")
    questoes = relationship("QuestaoGeradaDB", cascade="all, delete-orphan")

class QuestaoGeradaDB(Base):
    __tablename__ = "questoes_geradas"
    id = Column(Integer, primary_key=True, index=True)
    enunciado = Column(JSONB) # Alterado para JSONB
    alternativas = Column(JSONB)  # Armazenado nativamente como JSONB
    resposta_correta = Column(String)
    explicacao = Column(JSONB) # Alterado para JSONB
    dificuldade = Column(String)
    assunto_id = Column(Integer, ForeignKey("assuntos.id"))
    diagrama_svg = Column(String, nullable=True)

Base.metadata.create_all(bind=engine)

# Pydantic Models (Movidos para cima para evitar NameError)
class MateriaCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=50)

class AssuntoCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    materia_id: int

class GenerateRequest(BaseModel):
    materia: str
    assunto: str
    assunto_id: int
    dificuldade: str
    quantidade: int = Field(3, ge=1, le=10)

class TextPart(BaseModel):
    type: str  # 'text' ou 'latex'
    content: str

class Question(BaseModel):
    id: int = None
    enunciado: Union[List[TextPart], str]
    diagrama_svg: Optional[str] = None
    alternativas: List[str]
    resposta_correta: str
    explicacao: Union[List[TextPart], str]
    dificuldade: str = None

class QuestionListResponse(BaseModel):
    questoes: List[Question]
    total: int

class QuestionBatch(BaseModel):
    questoes: List[Question]

class PdfRequest(BaseModel):
    data: List[Question]
    title: str
# Configuração de CORS para permitir acesso do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Obrigatório ser False quando origin for "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuração da IA
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("ERRO CRÍTICO: GEMINI_API_KEY não configurada nas variáveis de ambiente.")

genai.configure(api_key=api_key)

# Configuração para garantir saída JSON estrita
generation_config = {
  "temperature": 0.7,
  "top_p": 0.95,
  "top_k": 40,
  "max_output_tokens": 8192,
  "response_mime_type": "application/json",
}

model = genai.GenerativeModel(
  model_name="gemini-3.1-flash-lite-preview",
  system_instruction="Sua única função é gerar um objeto JSON único, válido e minificado. Você é um especialista em seguir esquemas de dados à risca. Não adicione nenhum texto, comentário ou markdown fora do objeto JSON. Aderência estrita ao formato solicitado é a prioridade máxima.",
  generation_config=generation_config,
)

# Dependency para obter o DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    """Endpoint raiz para verificação de status."""
    return {"status": "ok", "message": "EduQuest.ai API está rodando."}

# Endpoints para buscar dados do Banco
@app.get("/materias")
def listar_materias(db: Session = Depends(get_db)):
    return db.query(MateriaDB).all()

@app.get("/assuntos/{materia_id}")
def listar_assuntos(materia_id: int, db: Session = Depends(get_db)):
    return db.query(AssuntoDB).filter(AssuntoDB.materia_id == materia_id).all()

@app.get("/questoes-salvas", response_model=QuestionListResponse)
def listar_questoes_salvas(
    assunto_ids: List[int] = Query(None), 
    questao_id: int = Query(None),
    keyword: str = Query(None), 
    dificuldade: str = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
    ordem: str = Query("desc"), # "asc" ou "desc"
    db: Session = Depends(get_db)
):
    query = db.query(QuestaoGeradaDB)

    if questao_id:
        # Se um ID específico for fornecido, ignora outros filtros e busca apenas por ele.
        query = query.filter(QuestaoGeradaDB.id == questao_id)
    else:
        if assunto_ids:
            query = query.filter(QuestaoGeradaDB.assunto_id.in_(assunto_ids))
        
        if keyword:
            query = query.filter(
                (QuestaoGeradaDB.enunciado.cast(String).ilike(f"%{keyword}%")) | 
                (QuestaoGeradaDB.explicacao.cast(String).ilike(f"%{keyword}%"))
            )

        if dificuldade:
            query = query.filter(QuestaoGeradaDB.dificuldade == dificuldade)
        
    total = query.count()
    
    if ordem == "asc":
        query = query.order_by(QuestaoGeradaDB.id.asc())
    else:
        query = query.order_by(QuestaoGeradaDB.id.desc())

    questoes = query.offset(offset).limit(limit).all()
    
    parsed_questions = []
    for q in questoes:
        # Lógica segura para extrair alternativas
        if isinstance(q.alternativas, list):
            alts = q.alternativas
        elif isinstance(q.alternativas, str):
            try:
                alts = json.loads(q.alternativas)
            except (json.JSONDecodeError, TypeError):
                alts = []
        else:
            alts = []

        parsed_questions.append(
            Question(
                id=q.id,
                enunciado=q.enunciado,
                diagrama_svg=q.diagrama_svg,
                alternativas=alts,
                resposta_correta=q.resposta_correta or "Não informada",
                explicacao=q.explicacao,
                dificuldade=q.dificuldade
            )
        )
    return {"questoes": parsed_questions, "total": total}

@app.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    try:
        total_materias = db.query(func.count(MateriaDB.id)).scalar()
        total_assuntos = db.query(func.count(AssuntoDB.id)).scalar()
        total_questoes = db.query(func.count(QuestaoGeradaDB.id)).scalar()
        
        # Estatísticas por dificuldade
        diff_stats = db.query(QuestaoGeradaDB.dificuldade, func.count(QuestaoGeradaDB.id)).group_by(QuestaoGeradaDB.dificuldade).all()
        por_dificuldade = {d: c for d, c in diff_stats if d}
        
    except Exception:
        total_materias = total_assuntos = total_questoes = 0
        por_dificuldade = {}
        
    return {
        "total_materias": total_materias,
        "total_assuntos": total_assuntos,
        "total_questoes": total_questoes,
        "por_dificuldade": por_dificuldade
    }

@app.post("/materias")
def criar_materia(materia: MateriaCreate, db: Session = Depends(get_db)):
    existing = db.query(MateriaDB).filter(MateriaDB.nome == materia.nome).first()
    if existing:
        raise HTTPException(status_code=409, detail="Matéria com este nome já existe.")
    try:
        db_materia = MateriaDB(nome=materia.nome)
        db.add(db_materia)
        db.commit()
        db.refresh(db_materia)
        return db_materia
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erro ao criar matéria: {e}")

@app.post("/assuntos")
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

@app.put("/materias/{materia_id}")
def editar_materia(materia_id: int, materia: MateriaCreate, db: Session = Depends(get_db)):
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

@app.put("/assuntos/{assunto_id}")
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

@app.delete("/questoes/{questao_id}")
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

@app.delete("/materias/{materia_id}")
def excluir_materia(materia_id: int, db: Session = Depends(get_db)):
    materia = db.query(MateriaDB).filter(MateriaDB.id == materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Matéria não encontrada")
    try:
        db.delete(materia)
        db.commit()
        return {"message": "Matéria e conteúdos vinculados excluídos"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erro ao excluir matéria: {e}")

@app.delete("/assuntos/{assunto_id}")
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

# Seed inicial para facilitar o teste
@app.on_event("startup")
def seed_db():
    print("Attempting to seed database...")
    db = SessionLocal()
    try:
        if db.query(MateriaDB).count() == 0:
            print("Database is empty, seeding initial data...")
            historia = MateriaDB(nome="História")
            matematica = MateriaDB(nome="Matemática")
            db.add_all([historia, matematica])
            db.commit()
            db.refresh(historia) # Refresh para pegar IDs
            db.refresh(matematica)
            
            assuntos = [
                AssuntoDB(nome="Revolução Francesa", materia_id=historia.id),
                AssuntoDB(nome="Segunda Guerra Mundial", materia_id=historia.id),
                AssuntoDB(nome="Equações do 2º Grau", materia_id=matematica.id)
            ]
            db.add_all(assuntos)
            db.commit()
            print("Initial data seeded successfully.")
        else:
            print("Database already contains data, skipping seed.")
    except Exception as e:
        print(f"Error during database seeding: {e}")
    db.close()

@app.post("/export-pdf")
async def export_pdf_endpoint(request: PdfRequest):
    # O nome do serviço 'pdf-renderer-service' vem do manifesto do Kubernetes
    renderer_url = "http://pdf-renderer-service:3000/render"
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client: # Timeout de 2 minutos
            response = await client.post(renderer_url, json=request.dict())

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Erro no serviço de renderização de PDF.")

        return StreamingResponse(iter([response.content]), media_type="application/pdf")

    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Não foi possível conectar ao serviço de PDF: {e}")

@app.post("/generate")
async def generate_questions_stream(request: GenerateRequest, db: Session = Depends(get_db)):

    # Define um semáforo para limitar o número de requisições concorrentes à IA.
    # Isso evita erros de "rate limiting" da API do Gemini quando muitas questões são pedidas.
    semaphore = asyncio.Semaphore(3)

    async def _generate_and_process_one_question():
        """Gera e processa uma única questão de forma assíncrona."""
        async with semaphore:
            prompt = f"""Gere UMA ÚNICA questão de múltipla escolha sobre o Tema '{request.assunto}' (Matéria: {request.materia}) com dificuldade '{request.dificuldade}'. Siga estas REGRAS DE FORMATAÇÃO com precisão absoluta: 1. **SAÍDA**: A resposta DEVE ser um único objeto JSON válido e minificado. NADA MAIS. 2. **ESQUEMA GERAL**: `{{"diagrama_svg": ..., "enunciado": [...], "alternativas": [...], "resposta_correta": "...", "explicacao": [...]}}` 3. **CAMPOS `enunciado` e `explicacao`**: - Use uma lista de objetos: `[{{"type": "text", "content": "..."}}, {{"type": "latex", "content": "..."}}]`. - SEMPRE separe texto de matemática. - No `content` do tipo `latex`, coloque APENAS o código LaTeX, **sem** os delimitadores `$` ou `$$`. - Use `\\n` para quebras de linha no `content` do tipo `text`. 4. **CAMPO `alternativas`**: - DEVE ser uma lista de strings simples. Ex: `["resposta 1", "resposta 2"]`. - NÃO use prefixos como "A)". - Se uma alternativa contiver matemática, inclua-a na string usando os delimitadores `[math]...[/math]`. O frontend usará MathJax para renderizar o conteúdo. - Exemplo de alternativa com matemática: `"A velocidade é de [math]100 \\\\text{{ km/h}}[/math]"` 5. **EXEMPLO COMPLETO DE SAÍDA PERFEITA**: ```json {{"diagrama_svg": null, "enunciado": [{{"type": "text", "content": "Dada a reação de combustão do metano: "}}, {{"type": "latex", "content": "CH_4(g) + 2O_2(g) \\\\rightarrow CO_2(g) + 2H_2O(l)"}}, {{"type": "text", "content": ". Qual é a variação de entalpia (ΔH) da reação?"}}], "alternativas": ["A energia liberada é de [math]-890[/math] kJ/mol", "A energia absorvida é de [math]+890[/math] kJ/mol", "A reação é endotérmica com [math]\\\\Delta H = -604[/math] kJ/mol", "A reação é exotérmica com [math]\\\\Delta H = +604[/math] kJ/mol", "Nenhuma das anteriores"], "resposta_correta": "A energia liberada é de [math]-890[/math] kJ/mol", "explicacao": [{{"type": "text", "content": "A variação de entalpia (ΔH) é a soma das entalpias dos produtos menos a dos reagentes. Para uma reação exotérmica, o valor é negativo, indicando liberação de energia. O cálculo correto resulta em "}}, {{"type": "latex", "content": "\\\\Delta H = -890 \\\\text{{ kJ/mol}}"}} ]}} ```"""

            response = None
            max_retries = 5
            base_delay = 2  # segundos

            for attempt in range(max_retries):
                try:
                    response = await model.generate_content_async(prompt)
                    break  # Sucesso, sai do loop de retentativas
                except google.api_core.exceptions.ResourceExhausted as e:
                    if attempt < max_retries - 1:
                        delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                        print(f"!!! AVISO: Rate limit da API atingido. Tentando novamente em {delay:.2f}s...")
                        await asyncio.sleep(delay)
                    else:
                        print(f"!!! ERRO: Rate limit excedido após {max_retries} tentativas. Desistindo desta questão.")
                except Exception as e:
                    print(f"!!! ERRO inesperado na chamada da API Gemini: {e}")
                    break # Não tenta novamente para outros tipos de erro

            if not response:
                return None # Retorna None se não conseguiu obter resposta da API

            try:
                # A IA agora retorna JSON diretamente, sem necessidade de sanitização manual.
                q_data = json.loads(response.text, strict=False)

                # Mapeamento de segurança: pergunta -> enunciado
                if "pergunta" in q_data and "enunciado" not in q_data:
                    q_data["enunciado"] = q_data.pop("pergunta")

                # Limpeza do SVG
                svg_content = q_data.get("diagrama_svg")
                if svg_content and isinstance(svg_content, str):
                    svg_match = re.search(r'<svg[\s\S]*?<\/svg>', svg_content, re.IGNORECASE)
                    q_data["diagrama_svg"] = html.unescape(svg_match.group(0)) if svg_match else None

                # Limpeza das alternativas
                alts = q_data.get("alternativas", [])
                if isinstance(alts, dict): 
                    alts = [v for k, v in sorted(alts.items())]
                
                cleaned_alts = []
                if isinstance(alts, list):
                    for alt in alts:
                        text_to_clean = ""
                        if isinstance(alt, dict):
                            # Extrai o texto de dentro do objeto, sendo flexível com a chave usada pela IA.
                            text_to_clean = alt.get('texto', alt.get('text', alt.get('content', str(alt))))
                        else:
                            text_to_clean = str(alt or "")
                        # Regex aprimorado para remover um ou mais prefixos (ex: "A) a)") de forma case-insensitive.
                        cleaned_text = re.sub(r'^([a-zA-Z][\)\.]\s*)+', '', text_to_clean)
                        cleaned_alts.append(cleaned_text.lstrip())
                q_data["alternativas"] = cleaned_alts
                # Validação de campos
                campos_obrigatorios = ["enunciado", "alternativas", "resposta_correta", "explicacao"]
                if not all(key in q_data for key in campos_obrigatorios):
                    print(f"Questão pulada por falta de campos: {q_data.keys()}")
                    return None

                nova_questao = QuestaoGeradaDB(
                    enunciado=q_data.get("enunciado", []),
                    diagrama_svg=q_data.get("diagrama_svg"),
                    alternativas=q_data.get("alternativas", []),
                    resposta_correta=q_data.get("resposta_correta", ""),
                    explicacao=q_data.get("explicacao", []),
                    dificuldade=request.dificuldade,
                    assunto_id=request.assunto_id
                )
                db.add(nova_questao)
                await asyncio.to_thread(db.flush) # Usar to_thread para operação de I/O síncrona

                return Question(
                    id=nova_questao.id,
                    enunciado=nova_questao.enunciado,
                    diagrama_svg=nova_questao.diagrama_svg,
                    alternativas=nova_questao.alternativas if isinstance(nova_questao.alternativas, list) else [],
                    resposta_correta=nova_questao.resposta_correta,
                    explicacao=nova_questao.explicacao,
                    dificuldade=nova_questao.dificuldade
                )
            except Exception as e:
                print(f"!!! ERRO AO PROCESSAR RESPOSTA DA IA: {e} !!!")
                return None

    async def stream_generator():
        """Orquestra a geração paralela e transmite os resultados à medida que chegam."""
        tasks = [
            asyncio.create_task(_generate_and_process_one_question())
            for _ in range(request.quantidade)
        ]
        
        try:
            for future in asyncio.as_completed(tasks):
                question_to_send = await future
                if question_to_send:
                    yield json.dumps(question_to_send.dict()) + "\n"
            
            await asyncio.to_thread(db.commit)

        except Exception as e:
            print(f"!!! ERRO INESPERADO NO ORQUESTRADOR DE GERAÇÃO: {e} !!!")
            await asyncio.to_thread(db.rollback)
            error_message = {"error": "Ocorreu um erro no servidor durante a geração."}
            yield json.dumps(error_message) + "\n"

    return StreamingResponse(stream_generator(), media_type="application/x-ndjson")
