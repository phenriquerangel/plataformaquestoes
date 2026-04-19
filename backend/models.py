from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
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


class PdfRequest(BaseModel):
    data: List[Question]
    title: str
