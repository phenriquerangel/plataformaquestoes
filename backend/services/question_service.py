import asyncio
import json
import os
import random
import re

import google.api_core.exceptions
import google.generativeai as genai

from config import GENERATION_BASE_DELAY_SECONDS, GENERATION_MAX_RETRIES
from models import GenerateRequest, Question, QuestaoGeradaDB

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

_PROMPT_TEMPLATE = """Gere {quantidade} questões de múltipla escolha sobre o Tema '{assunto}' (Matéria: {materia}) com dificuldade '{dificuldade}'.

REGRAS DE FORMATAÇÃO (siga à risca):
1. **SAÍDA**: Um array JSON com exatamente {quantidade} objetos. NADA MAIS.
2. **ESQUEMA DE CADA OBJETO**: {{"diagrama": null, "enunciado": [...], "alternativas": [...], "resposta_correta": "...", "explicacao": [...]}}
3. **CAMPO `diagrama`**: Se a questão envolver figura geométrica (triângulos, círculos, quadriláteros, etc.), gere um objeto com "viewBox" e "elementos". Caso contrário use null. Tipos de elementos:
   - {{"tipo": "poligono", "pontos": [[x,y],...], "preenchimento": "#eff6ff", "borda": "#2563eb"}}
   - {{"tipo": "circulo", "cx": x, "cy": y, "r": r, "preenchimento": "#eff6ff", "borda": "#2563eb"}}
   - {{"tipo": "linha", "x1": x, "y1": y, "x2": x, "y2": y, "cor": "#64748b"}}
   - {{"tipo": "angulo_reto", "vertice": [x,y], "v1": [x,y], "v2": [x,y]}}
   - {{"tipo": "texto", "x": x, "y": y, "conteudo": "...", "ancora": "start|middle|end"}}
   Coordenadas: Y cresce para baixo. Use viewBox "0 0 220 180" como padrão, com margem de 20px.
4. **CAMPOS `enunciado` e `explicacao`**: OBRIGATORIAMENTE lista de objetos {{"type": "text"|"latex", "content": "..."}}. NUNCA uma string. No type `latex`, coloque APENAS o código LaTeX sem delimitadores `$`.
5. **CAMPO `alternativas`**: Lista de strings simples sem prefixos "A)". Para matemática inline use `[math]...[/math]`.
6. **VARIEDADE**: As {quantidade} questões devem abordar aspectos diferentes do tema, sem repetição.

EXEMPLO com diagrama (triângulo retângulo ABC, catetos AB=6 e BC=8):
{{"diagrama": {{"viewBox": "0 0 220 190", "elementos": [{{"tipo": "poligono", "pontos": [[30,160],[30,30],[180,160]], "preenchimento": "#eff6ff", "borda": "#2563eb"}}, {{"tipo": "angulo_reto", "vertice": [30,160], "v1": [30,30], "v2": [180,160]}}, {{"tipo": "texto", "x": 30, "y": 22, "conteudo": "A", "ancora": "middle"}}, {{"tipo": "texto", "x": 20, "y": 175, "conteudo": "B", "ancora": "middle"}}, {{"tipo": "texto", "x": 190, "y": 175, "conteudo": "C", "ancora": "middle"}}, {{"tipo": "texto", "x": 12, "y": 98, "conteudo": "6", "ancora": "end"}}, {{"tipo": "texto", "x": 105, "y": 178, "conteudo": "8", "ancora": "middle"}}]}}, "enunciado": [{{"type": "text", "content": "No triângulo retângulo ABC, com catetos AB = 6 e BC = 8, qual é o seno do ângulo C?"}}], "alternativas": ["[math]\\\\frac{{3}}{{5}}[/math]", "[math]\\\\frac{{4}}{{5}}[/math]", "[math]\\\\frac{{3}}{{4}}[/math]", "[math]\\\\frac{{5}}{{3}}[/math]", "[math]\\\\frac{{1}}{{2}}[/math]"], "resposta_correta": "[math]\\\\frac{{3}}{{5}}[/math]", "explicacao": [{{"type": "text", "content": "A hipotenusa é AC = 10. O seno de C é cateto oposto sobre hipotenusa: "}}, {{"type": "latex", "content": "\\\\sin C = \\\\frac{{6}}{{10}} = \\\\frac{{3}}{{5}}"}}]}}"""


def _clean_q_data(q_data: dict) -> dict | None:
    if "pergunta" in q_data and "enunciado" not in q_data:
        q_data["enunciado"] = q_data.pop("pergunta")

    alts = q_data.get("alternativas", [])
    if isinstance(alts, dict):
        alts = [v for _, v in sorted(alts.items())]

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


async def generate_and_stream(request: GenerateRequest, db):
    prompt = _PROMPT_TEMPLATE.format(
        assunto=request.assunto,
        materia=request.materia,
        dificuldade=request.dificuldade,
        quantidade=request.quantidade,
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

            nova = QuestaoGeradaDB(
                enunciado=q_data.get("enunciado", []),
                alternativas=q_data.get("alternativas", []),
                resposta_correta=q_data.get("resposta_correta", ""),
                explicacao=q_data.get("explicacao", []),
                dificuldade=request.dificuldade,
                assunto_id=request.assunto_id,
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
            ).dict()) + "\n"

        await asyncio.to_thread(db.commit)
    except Exception as e:
        print(f"Erro ao processar resposta da IA: {e}")
        await asyncio.to_thread(db.rollback)
        yield json.dumps({"error": "Erro ao processar resposta da IA."}) + "\n"
