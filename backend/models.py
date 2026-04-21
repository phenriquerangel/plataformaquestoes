from sqlalchemy import Boolean, Column, DateTime, Integer, String, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, Field
from typing import List, Optional, Union

from database import Base


# --- SQLAlchemy Models ---

class SerieDB(Base):
    __tablename__ = "series"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, nullable=False)
    ordem = Column(Integer, nullable=False)
    assuntos = relationship("AssuntoDB", back_populates="serie_rel")


class MateriaDB(Base):
    __tablename__ = "materias"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, index=True)
    serie = Column(String, nullable=True)
    assuntos = relationship("AssuntoDB", back_populates="materia", cascade="all, delete-orphan")


class AssuntoDB(Base):
    __tablename__ = "assuntos"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String)
    materia_id = Column(Integer, ForeignKey("materias.id"))
    serie = Column(String, nullable=True)
    serie_id = Column(Integer, ForeignKey("series.id"), nullable=True, index=True)
    materia = relationship("MateriaDB", back_populates="assuntos")
    serie_rel = relationship("SerieDB", back_populates="assuntos")
    questoes = relationship("QuestaoGeradaDB", cascade="all, delete-orphan")


class QuestaoGeradaDB(Base):
    __tablename__ = "questoes_geradas"
    id = Column(Integer, primary_key=True, index=True)
    enunciado = Column(JSONB)
    alternativas = Column(JSONB)
    resposta_correta = Column(String)
    explicacao = Column(JSONB)
    dificuldade = Column(String)
    tipo = Column(String, nullable=True, default="multipla_escolha")
    assunto_id = Column(Integer, ForeignKey("assuntos.id"))
    professor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True)
    diagrama_svg = Column(String, nullable=True)
    diagrama = Column(JSONB, nullable=True)


class ListaDB(Base):
    __tablename__ = "listas"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    status = Column(String, nullable=False, default="rascunho")
    professor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    questoes = relationship(
        "ListaQuestaoAssociation",
        back_populates="lista",
        cascade="all, delete-orphan",
        order_by="ListaQuestaoAssociation.ordem",
    )


class ListaQuestaoAssociation(Base):
    __tablename__ = "lista_questoes"
    lista_id = Column(Integer, ForeignKey("listas.id"), primary_key=True)
    questao_id = Column(Integer, ForeignKey("questoes_geradas.id"), primary_key=True)
    ordem = Column(Integer, default=0)
    lista = relationship("ListaDB", back_populates="questoes")
    questao = relationship("QuestaoGeradaDB")


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
    serie: Optional[str] = None


class AssuntoCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    materia_id: int
    serie: Optional[str] = None


class GenerateRequest(BaseModel):
    materia: str
    assunto: str
    assunto_id: Optional[int] = None
    dificuldade: str
    quantidade: int = Field(3, ge=1, le=10)
    tipo: str = "multipla_escolha"
    serie: Optional[str] = None


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
    tipo: Optional[str] = "multipla_escolha"


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


class ListaCreate(BaseModel):
    nome: str = Field(..., min_length=1, max_length=200)


class ListaUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    status: Optional[str] = None


class ListaQuestaoAdd(BaseModel):
    questao_id: int


class ListaResponse(BaseModel):
    id: int
    nome: str
    status: str
    professor_id: int
    total_questoes: int

    class Config:
        from_attributes = True
