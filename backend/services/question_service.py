import asyncio
import json
import os
import random
import re

import google.api_core.exceptions
import google.generativeai as genai

from config import GENERATION_BASE_DELAY_SECONDS, GENERATION_MAX_RETRIES
from models import GenerateRequest, Question, QuestaoGeradaDB
from services.log_service import registrar_evento_async

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("ERRO CRÍTICO: GEMINI_API_KEY não configurada nas variáveis de ambiente.")

genai.configure(api_key=api_key)

_model = genai.GenerativeModel(
    model_name="gemini-3.1-flash-lite-preview",
    system_instruction=(
        "Sua única função é gerar um array JSON válido e minificado de questões educacionais. "
        "Não adicione nenhum texto, comentário ou markdown fora do array JSON. "
        "Aderência estrita ao formato solicitado é a prioridade máxima."
    ),
    generation_config={
        "temperature": 0.7,
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 8192,
        "response_mime_type": "application/json",
    },
)

_PROMPT_MULTIPLA_ESCOLHA = """Gere {quantidade} questões de múltipla escolha sobre o Tema '{assunto}' (Matéria: {materia}{serie_ctx}) com dificuldade '{dificuldade}'.

REGRAS DE FORMATAÇÃO (siga à risca):
1. **SAÍDA**: Um array JSON com exatamente {quantidade} objetos. NADA MAIS.
2. **ESQUEMA DE CADA OBJETO**: {{"tipo": "multipla_escolha", "diagrama": null, "enunciado": [...], "alternativas": [...], "resposta_correta": "...", "explicacao": [...]}}
3. **CAMPO `diagrama`**: Se a questão envolver figura geométrica (triângulos, círculos, quadriláteros, etc.), gere um objeto com "viewBox" e "elementos". Caso contrário use null. Tipos de elementos:
   - {{"tipo": "poligono", "pontos": [[x,y],...], "preenchimento": "#eff6ff", "borda": "#2563eb"}}
   - {{"tipo": "circulo", "cx": x, "cy": y, "r": r, "preenchimento": "#eff6ff", "borda": "#2563eb"}}
   - {{"tipo": "linha", "x1": x, "y1": y, "x2": x, "y2": y, "cor": "#64748b"}}
   - {{"tipo": "angulo_reto", "vertice": [x,y], "v1": [x,y], "v2": [x,y]}}
   - {{"tipo": "texto", "x": x, "y": y, "conteudo": "...", "ancora": "start|middle|end"}}
   Coordenadas: Y cresce para baixo. Use viewBox "0 0 220 180" como padrão, com margem de 20px.
4. **CAMPOS `enunciado` e `explicacao`**: OBRIGATORIAMENTE lista de objetos {{"type": "text"|"latex", "content": "..."}}. NUNCA uma string. No type `latex`, coloque APENAS o código LaTeX sem delimitadores `$`.
5. **CAMPO `alternativas`**: Lista de 5 strings simples sem prefixos "A)". Para matemática inline use `[math]...[/math]`.
6. **VARIEDADE**: As {quantidade} questões devem abordar aspectos diferentes do tema, sem repetição."""

_PROMPT_VERDADEIRO_FALSO = """Gere {quantidade} questões de verdadeiro ou falso sobre o Tema '{assunto}' (Matéria: {materia}{serie_ctx}) com dificuldade '{dificuldade}'.

REGRAS DE FORMATAÇÃO (siga à risca):
1. **SAÍDA**: Um array JSON com exatamente {quantidade} objetos. NADA MAIS.
2. **ESQUEMA DE CADA OBJETO**: {{"tipo": "verdadeiro_falso", "diagrama": null, "enunciado": [...], "alternativas": ["Verdadeiro", "Falso"], "resposta_correta": "Verdadeiro" ou "Falso", "explicacao": [...]}}
3. **CAMPO `enunciado`**: Uma afirmação que pode ser verdadeira ou falsa. OBRIGATORIAMENTE lista de objetos {{"type": "text"|"latex", "content": "..."}}.
4. **CAMPO `alternativas`**: SEMPRE exatamente ["Verdadeiro", "Falso"].
5. **CAMPO `resposta_correta`**: SEMPRE "Verdadeiro" ou "Falso".
6. **CAMPO `explicacao`**: Explicação clara do por quê a afirmação é verdadeira ou falsa. Lista de objetos {{"type": "text"|"latex", "content": "..."}}.
7. **VARIEDADE**: Misture afirmações verdadeiras e falsas. As {quantidade} questões devem abordar aspectos diferentes do tema."""

_PROMPT_DISSERTATIVA = """Gere {quantidade} questões dissertativas sobre o Tema '{assunto}' (Matéria: {materia}{serie_ctx}) com dificuldade '{dificuldade}'.

REGRAS DE FORMATAÇÃO (siga à risca):
1. **SAÍDA**: Um array JSON com exatamente {quantidade} objetos. NADA MAIS.
2. **ESQUEMA DE CADA OBJETO**: {{"tipo": "dissertativa", "diagrama": null, "enunciado": [...], "alternativas": [], "resposta_correta": "", "explicacao": [...]}}
3. **CAMPO `enunciado`**: Pergunta ou problema aberto que exige resposta elaborada. OBRIGATORIAMENTE lista de objetos {{"type": "text"|"latex", "content": "..."}}.
4. **CAMPO `alternativas`**: SEMPRE lista vazia [].
5. **CAMPO `resposta_correta`**: SEMPRE string vazia "".
6. **CAMPO `explicacao`**: Resposta modelo completa e bem estruturada. Lista de objetos {{"type": "text"|"latex", "content": "..."}}.
7. **VARIEDADE**: As {quantidade} questões devem abordar aspectos diferentes do tema, exigindo análise, síntese ou argumentação."""

_PROMPT_MISTO = """Gere {quantidade} questões MISTAS (variando entre múltipla escolha, verdadeiro/falso e dissertativa) sobre o Tema '{assunto}' (Matéria: {materia}{serie_ctx}) com dificuldade '{dificuldade}'.

REGRAS DE FORMATAÇÃO (siga à risca):
1. **SAÍDA**: Um array JSON com exatamente {quantidade} objetos. NADA MAIS.
2. **TIPOS**: Distribua entre "multipla_escolha", "verdadeiro_falso" e "dissertativa". Ao menos um de cada tipo se {quantidade} >= 3.
3. **ESQUEMA BASE**: {{"tipo": "...", "diagrama": null, "enunciado": [...], "alternativas": [...], "resposta_correta": "...", "explicacao": [...]}}
4. **Para múltipla escolha**: alternativas = lista de 5 strings; resposta_correta = uma das alternativas.
5. **Para verdadeiro/falso**: alternativas = ["Verdadeiro", "Falso"]; resposta_correta = "Verdadeiro" ou "Falso".
6. **Para dissertativa**: alternativas = []; resposta_correta = ""; explicacao = resposta modelo.
7. **CAMPOS `enunciado` e `explicacao`**: OBRIGATORIAMENTE lista de objetos {{"type": "text"|"latex", "content": "..."}}.
8. **VARIEDADE**: As {quantidade} questões devem abordar aspectos diferentes do tema."""

_PROMPTS = {
    "multipla_escolha": _PROMPT_MULTIPLA_ESCOLHA,
    "verdadeiro_falso": _PROMPT_VERDADEIRO_FALSO,
    "dissertativa": _PROMPT_DISSERTATIVA,
    "misto": _PROMPT_MISTO,
}


def _clean_q_data(q_data: dict) -> dict | None:
    if "pergunta" in q_data and "enunciado" not in q_data:
        q_data["enunciado"] = q_data.pop("pergunta")

    tipo = q_data.get("tipo", "multipla_escolha")

    alts = q_data.get("alternativas", [])
    if isinstance(alts, dict):
        alts = [v for _, v in sorted(alts.items())]

    if tipo == "dissertativa":
        q_data["alternativas"] = []
        if not q_data.get("resposta_correta"):
            q_data["resposta_correta"] = ""
    else:
        cleaned_alts = []
        for alt in (alts if isinstance(alts, list) else []):
            text = alt.get('texto', alt.get('text', alt.get('content', str(alt)))) if isinstance(alt, dict) else str(alt or "")
            cleaned_alts.append(re.sub(r'^([a-zA-Z][\)\.]\s*)+', '', text).lstrip())
        q_data["alternativas"] = cleaned_alts

    if not all(k in q_data for k in ["enunciado", "alternativas", "resposta_correta", "explicacao"]):
        print(f"Questão ignorada por falta de campos: {list(q_data.keys())}")
        return None

    for field in ("enunciado", "explicacao"):
        if isinstance(q_data[field], str):
            q_data[field] = [{"type": "text", "content": q_data[field]}]

    return q_data


async def generate_and_stream(request: GenerateRequest, db, professor_id: int = None):
    template = _PROMPTS.get(request.tipo, _PROMPT_MULTIPLA_ESCOLHA)
    serie_ctx = f", Série: {request.serie}" if request.serie else ""
    prompt = template.format(
        assunto=request.assunto,
        materia=request.materia,
        dificuldade=request.dificuldade,
        quantidade=request.quantidade,
        serie_ctx=serie_ctx,
    )

    response = None
    for attempt in range(GENERATION_MAX_RETRIES):
        try:
            response = await _model.generate_content_async(prompt)
            break
        except google.api_core.exceptions.ResourceExhausted:
            if attempt < GENERATION_MAX_RETRIES - 1:
                delay = GENERATION_BASE_DELAY_SECONDS * (2 ** attempt) + random.uniform(0, 1)
                print(f"Rate limit atingido. Retentando em {delay:.2f}s...")
                await asyncio.sleep(delay)
            else:
                print(f"Rate limit excedido após {GENERATION_MAX_RETRIES} tentativas.")
        except Exception as e:
            print(f"Erro inesperado na chamada Gemini: {e}")
            break

    if not response:
        await registrar_evento_async(
            "geracao_erro",
            f"Falha na geração: {request.materia} / {request.assunto}",
            {"materia": request.materia, "assunto": request.assunto, "dificuldade": request.dificuldade, "erro": "rate_limit_ou_timeout"},
        )
        yield json.dumps({"error": "Falha ao obter resposta da IA."}) + "\n"
        return

    try:
        questions_data, _ = json.JSONDecoder().raw_decode(response.text.strip())
        if not isinstance(questions_data, list):
            questions_data = [questions_data]

        for q_data in questions_data:
            q_data = _clean_q_data(q_data)
            if not q_data:
                continue

            diagrama = q_data.get("diagrama")
            if not isinstance(diagrama, dict):
                diagrama = None

            tipo_questao = q_data.get("tipo", request.tipo)
            if request.tipo != "misto":
                tipo_questao = request.tipo

            nova = QuestaoGeradaDB(
                enunciado=q_data.get("enunciado", []),
                alternativas=q_data.get("alternativas", []),
                resposta_correta=q_data.get("resposta_correta", ""),
                explicacao=q_data.get("explicacao", []),
                dificuldade=request.dificuldade,
                tipo=tipo_questao,
                assunto_id=request.assunto_id,
                professor_id=professor_id,
                diagrama=diagrama,
            )
            db.add(nova)
            await asyncio.to_thread(db.flush)

            yield json.dumps(Question(
                id=nova.id,
                enunciado=nova.enunciado,
                diagrama=nova.diagrama,
                alternativas=nova.alternativas if isinstance(nova.alternativas, list) else [],
                resposta_correta=nova.resposta_correta,
                explicacao=nova.explicacao,
                dificuldade=nova.dificuldade,
                tipo=nova.tipo,
            ).dict()) + "\n"

        await asyncio.to_thread(db.commit)
        await registrar_evento_async(
            "geracao",
            f"Geração concluída: {request.materia} / {request.assunto} ({request.dificuldade}, {request.tipo})",
            {
                "materia": request.materia,
                "assunto": request.assunto,
                "assunto_id": request.assunto_id,
                "dificuldade": request.dificuldade,
                "quantidade": request.quantidade,
                "tipo": request.tipo,
                "professor_id": professor_id,
            },
        )
    except Exception as e:
        print(f"Erro ao processar resposta da IA: {e}")
        await asyncio.to_thread(db.rollback)
        await registrar_evento_async(
            "geracao_erro",
            f"Erro ao processar resposta: {request.materia} / {request.assunto}",
            {"materia": request.materia, "assunto": request.assunto, "dificuldade": request.dificuldade, "erro": str(e)},
        )
        yield json.dumps({"error": "Erro ao processar resposta da IA."}) + "\n"
