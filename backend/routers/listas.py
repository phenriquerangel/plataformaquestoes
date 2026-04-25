import json
from typing import List

from auth import get_current_user
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import (
    ListaCreate, ListaDB, ListaQuestaoAdd, ListaQuestaoAssociation, ListaQuestaoOrdem,
    ListaResponse, ListaUpdate, QuestaoGeradaDB, Question,
)

router = APIRouter(prefix="/listas", tags=["Listas"])


def _check_owner(lista: ListaDB, current_user: dict):
    if lista.professor_id != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")


def _questao_to_dict(q) -> dict:
    alts = q.alternativas if isinstance(q.alternativas, list) else []
    return Question(
        id=q.id,
        enunciado=q.enunciado,
        diagrama=q.diagrama,
        alternativas=alts,
        resposta_correta=q.resposta_correta or "",
        explicacao=q.explicacao,
        dificuldade=q.dificuldade,
        tipo=q.tipo or "multipla_escolha",
        tags=q.tags or [],
    ).dict()


@router.get("", response_model=List[ListaResponse])
def listar_listas(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(ListaDB)
    if current_user["role"] != "admin":
        query = query.filter(ListaDB.professor_id == current_user["id"])
    listas = query.order_by(ListaDB.created_at.desc()).all()
    return [
        ListaResponse(
            id=l.id,
            nome=l.nome,
            status=l.status,
            incluir_gabarito=l.incluir_gabarito,
            professor_id=l.professor_id,
            total_questoes=len(l.questoes),
        )
        for l in listas
    ]


@router.post("", response_model=ListaResponse, status_code=201)
def criar_lista(body: ListaCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    nova = ListaDB(nome=body.nome, incluir_gabarito=body.incluir_gabarito, professor_id=current_user["id"])
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return ListaResponse(id=nova.id, nome=nova.nome, status=nova.status, incluir_gabarito=nova.incluir_gabarito, professor_id=nova.professor_id, total_questoes=0)


@router.put("/{lista_id}", response_model=ListaResponse)
def atualizar_lista(lista_id: int, body: ListaUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    lista = db.query(ListaDB).filter(ListaDB.id == lista_id).first()
    if not lista:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    _check_owner(lista, current_user)
    if body.nome is not None:
        lista.nome = body.nome
    if body.status is not None:
        lista.status = body.status
    if body.incluir_gabarito is not None:
        lista.incluir_gabarito = body.incluir_gabarito
    db.commit()
    db.refresh(lista)
    return ListaResponse(id=lista.id, nome=lista.nome, status=lista.status, incluir_gabarito=lista.incluir_gabarito, professor_id=lista.professor_id, total_questoes=len(lista.questoes))


@router.delete("/{lista_id}", status_code=204)
def excluir_lista(lista_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    lista = db.query(ListaDB).filter(ListaDB.id == lista_id).first()
    if not lista:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    _check_owner(lista, current_user)
    db.delete(lista)
    db.commit()


@router.post("/{lista_id}/duplicate", response_model=ListaResponse, status_code=201)
def duplicar_lista(lista_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    lista = db.query(ListaDB).filter(ListaDB.id == lista_id).first()
    if not lista:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    _check_owner(lista, current_user)

    nova = ListaDB(
        nome=f"{lista.nome} (cópia)",
        status="rascunho",
        incluir_gabarito=lista.incluir_gabarito,
        professor_id=current_user["id"],
    )
    db.add(nova)
    db.flush()

    for assoc in lista.questoes:
        db.add(ListaQuestaoAssociation(lista_id=nova.id, questao_id=assoc.questao_id, ordem=assoc.ordem))

    db.commit()
    db.refresh(nova)
    return ListaResponse(id=nova.id, nome=nova.nome, status=nova.status, incluir_gabarito=nova.incluir_gabarito, professor_id=nova.professor_id, total_questoes=len(nova.questoes))


@router.get("/{lista_id}/questoes")
def listar_questoes_da_lista(
    lista_id: int,
    limit: int = Query(20),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    lista = db.query(ListaDB).filter(ListaDB.id == lista_id).first()
    if not lista:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    _check_owner(lista, current_user)

    total = len(lista.questoes)
    assocs = lista.questoes[offset:offset + limit]

    questoes = []
    for assoc in assocs:
        q = assoc.questao
        if not q:
            continue
        questoes.append(_questao_to_dict(q))

    return {"questoes": questoes, "total": total}


@router.patch("/{lista_id}/questoes/reorder", status_code=200)
def reordenar_questoes(lista_id: int, body: List[ListaQuestaoOrdem], db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    lista = db.query(ListaDB).filter(ListaDB.id == lista_id).first()
    if not lista:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    _check_owner(lista, current_user)

    for item in body:
        assoc = db.query(ListaQuestaoAssociation).filter_by(lista_id=lista_id, questao_id=item.questao_id).first()
        if assoc:
            assoc.ordem = item.ordem

    db.commit()
    return {"message": "Ordem atualizada"}


@router.get("/{lista_id}/public")
def visualizar_lista_publica(lista_id: int, db: Session = Depends(get_db)):
    lista = db.query(ListaDB).filter(ListaDB.id == lista_id).first()
    if not lista:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    if lista.status != "publicada":
        raise HTTPException(status_code=403, detail="Esta lista não está publicada")

    questoes = [_questao_to_dict(assoc.questao) for assoc in lista.questoes if assoc.questao]
    return {"id": lista.id, "nome": lista.nome, "incluir_gabarito": lista.incluir_gabarito, "questoes": questoes, "total": len(questoes)}


@router.post("/{lista_id}/questoes", status_code=201)
def adicionar_questao(lista_id: int, body: ListaQuestaoAdd, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    lista = db.query(ListaDB).filter(ListaDB.id == lista_id).first()
    if not lista:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    _check_owner(lista, current_user)

    questao = db.query(QuestaoGeradaDB).filter(QuestaoGeradaDB.id == body.questao_id).first()
    if not questao:
        raise HTTPException(status_code=404, detail="Questão não encontrada")

    exists = db.query(ListaQuestaoAssociation).filter_by(lista_id=lista_id, questao_id=body.questao_id).first()
    if exists:
        raise HTTPException(status_code=409, detail="Questão já está na lista")

    ordem = len(lista.questoes)
    assoc = ListaQuestaoAssociation(lista_id=lista_id, questao_id=body.questao_id, ordem=ordem)
    db.add(assoc)
    db.commit()
    return {"message": "Questão adicionada"}


@router.delete("/{lista_id}/questoes/{questao_id}", status_code=204)
def remover_questao(lista_id: int, questao_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    lista = db.query(ListaDB).filter(ListaDB.id == lista_id).first()
    if not lista:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    _check_owner(lista, current_user)

    assoc = db.query(ListaQuestaoAssociation).filter_by(lista_id=lista_id, questao_id=questao_id).first()
    if not assoc:
        raise HTTPException(status_code=404, detail="Questão não encontrada na lista")
    db.delete(assoc)
    db.commit()
