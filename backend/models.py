from sqlalchemy import Boolean, Column, DateTime, Integer, String, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, Field
from typing import List, Optional, Union

from database import Base


# --- SQLAlchemy Models ---

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
    enunciado = Column(JSONB)
    alternativas = Column(JSONB)
    resposta_correta = Column(String)
    explicacao = Column(JSONB)
    dificuldade = Column(String)
    assunto_id = Column(Integer, ForeignKey("assuntos.id"))
    diagrama_svg = Column(String, nullable=True)
    diagrama = Column(JSONB, nullable=True)


class EventoLogDB(Base):
    __tablename__ = "eventos_log"
    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String, index=True)
    descricao = Column(String)
    extra = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class UsuarioDB(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user")
    ativo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# --- Pydantic Schemas ---

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
    type: str
    content: str


class Question(BaseModel):
    id: int = None
    enunciado: Union[List[TextPart], str]
    diagrama_svg: Optional[str] = None
    diagrama: Optional[dict] = None
    alternativas: List[str]
    resposta_correta: str
    explicacao: Union[List[TextPart], str]
    dificuldade: str = None


class QuestionListResponse(BaseModel):
    questoes: List[Question]
    total: int


class QuestionBatch(BaseModel):
    questoes: List[Question]


class QuestionUpdate(BaseModel):
    dificuldade: Optional[str] = None
    resposta_correta: Optional[str] = None


class UsuarioCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=4)
    role: str = "user"


class UsuarioUpdate(BaseModel):
    role: Optional[str] = None
    password: Optional[str] = None
    ativo: Optional[bool] = None


class PdfRequest(BaseModel):
    data: List[Question]
    title: str
