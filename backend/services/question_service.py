import asyncio
import json
import os
import random
import re
from datetime import datetime, timedelta, timezone

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
3. **CAMPO `diagrama`**: Se a questão envolver figura geométrica (triângulos, círculos, quadriláteros, etc.) OU expressões de potenciação/radiciação (use uma grade NxN para representar N², fileiras de quadrados para bases e expoentes, etc.), gere um objeto com "viewBox" e "elementos". Caso contrário use null. Tipos de elementos:
   - {{"tipo": "poligono", "pontos": [[x,y],...], "preenchimento": "#eff6ff", "borda": "#2563eb"}}
   - {{"tipo": "circulo", "cx": x, "cy": y, "r": r, "preenchimento": "#eff6ff", "borda": "#2563eb"}}
   - {{"tipo": "linha", "x1": x, "y1": y, "x2": x, "y2": y, "cor": "#64748b"}}
   - {{"tipo": "angulo_reto", "vertice": [x,y], "v1": [x,y], "v2": [x,y]}}
   - {{"tipo": "texto", "x": x, "y": y, "conteudo": "...", "ancora": "start|middle|end"}}
   Coordenadas: Y cresce para baixo. Use viewBox "0 0 220 180" como padrão, com margem de 20px.
   Exemplo de grade para 3² (3x3 = 9 quadrados de 30px cada, iniciando em x=35, y=30): gere 9 polígonos {{"tipo":"poligono","pontos":[[35,30],[65,30],[65,60],[35,60]],...}} e os outros 8 deslocados.
4. **CAMPOS `enunciado` e `explicacao`**: OBRIGATORIAMENTE lista de objetos {{"type": "text"|"latex", "content": "..."}}. NUNCA uma string. No type `latex`, coloque APENAS o código LaTeX sem delimitadores `$`. ATENÇÃO: dentro de JSON, backslash deve ser escapado com duplo backslash. Exemplos: expoente → {{"type":"latex","content":"3^{{2}}"}}, fração → {{"type":"latex","content":"\\\\frac{{1}}{{2}}"}}, raiz → {{"type":"latex","content":"\\\\sqrt{{9}}"}}, produto → {{"type":"latex","content":"3 \\\\times 4"}}.
5. **CAMPO `alternativas`**: Lista de 5 strings. TODA expressão matemática (expoentes, frações, raízes, equações) DEVE usar `[math]...[/math]`. ATENÇÃO: dentro de JSON strings, backslash deve ser escapado. Exemplos: "[math]3^{{2}}[/math]", "[math]\\\\frac{{x}}{{2}}[/math]", "[math]\\\\sqrt{{16}}[/math]". NUNCA escreva `3^2` como texto puro.
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
3. **CAMPO `enunciado`**: Pergunta ou problema aberto que exige resposta elaborada. OBRIGATORIAMENTE lista de objetos {{"type": "text"|"latex", "content": "..."}}. No type `latex`, APENAS o código LaTeX sem `$`. ATENÇÃO: dentro de JSON, backslash deve ser escapado com duplo backslash. Exemplos: {{"type":"latex","content":"3^{{2}}"}}, {{"type":"latex","content":"\\\\frac{{1}}{{2}}"}}, {{"type":"latex","content":"\\\\sqrt{{9}}"}}.
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
7. **CAMPOS `enunciado` e `explicacao`**: OBRIGATORIAMENTE lista de objetos {{"type": "text"|"latex", "content": "..."}}. No type `latex`, APENAS o código LaTeX sem `$`. ATENÇÃO: dentro de JSON, backslash deve ser escapado com duplo backslash. Exemplos: {{"type":"latex","content":"3^{{2}}"}}, {{"type":"latex","content":"\\\\frac{{1}}{{2}}"}}, {{"type":"latex","content":"\\\\sqrt{{9}}"}}.
8. **CAMPO `alternativas` (múltipla escolha)**: TODA expressão matemática DEVE usar `[math]...[/math]`. ATENÇÃO: backslash deve ser escapado. Ex: "[math]3^{{2}}[/math]", "[math]\\\\frac{{x}}{{2}}[/math]". NUNCA escreva `3^2` como texto puro.
9. **VARIEDADE**: As {quantidade} questões devem abordar aspectos diferentes do tema."""

_PROMPT_PROBLEMA = """Gere {quantidade} problemas contextualizados sobre o Tema '{assunto}' (Matéria: {materia}{serie_ctx}) com dificuldade '{dificuldade}'.

REGRAS DE FORMATAÇÃO (siga à risca):
1. **SAÍDA**: Um array JSON com exatamente {quantidade} objetos. NADA MAIS.
2. **ESQUEMA DE CADA OBJETO**: {{"tipo": "multipla_escolha", "diagrama": null, "enunciado": [...], "alternativas": [...], "resposta_correta": "...", "explicacao": [...]}}
3. **CAMPO `enunciado`**: Uma situação-problema do mundo real (história, narrativa, contexto cotidiano) que exige cálculo ou raciocínio para resolver. OBRIGATORIAMENTE lista de objetos {{"type": "text"|"latex", "content": "..."}}. Exemplos: "João tem 4 laranjas e divide cada uma em 4 pedaços. Quantos pedaços ele terá ao todo?", "Uma loja vendeu 3 caixas com 12 chocolates cada. Quantos chocolates foram vendidos?".
4. **CAMPO `alternativas`**: Lista de 5 strings com possíveis respostas numéricas ou expressões. TODA expressão matemática DEVE usar `[math]...[/math]`.
5. **CAMPO `resposta_correta`**: Uma das 5 alternativas, a correta.
6. **CAMPO `explicacao`**: Resolução passo a passo do problema. Lista de objetos {{"type": "text"|"latex", "content": "..."}}.
7. **CAMPO `diagrama`**: null na maioria dos casos. Use apenas se o problema envolver figura geométrica concreta.
8. **VARIEDADE**: Os {quantidade} problemas devem ter contextos diferentes (personagens, situações, objetos), sem repetição."""

_PROMPTS = {
    "multipla_escolha": _PROMPT_MULTIPLA_ESCOLHA,
    "verdadeiro_falso": _PROMPT_VERDADEIRO_FALSO,
    "dissertativa": _PROMPT_DISSERTATIVA,
    "misto": _PROMPT_MISTO,
    "problema": _PROMPT_PROBLEMA,
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


def _check_cache_sync(request, db, professor_id: int):
    """Versão síncrona para uso em asyncio.to_thread."""
    if not request.assunto_id:
        return None
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    query = db.query(QuestaoGeradaDB).filter(
        QuestaoGeradaDB.assunto_id == request.assunto_id,
        QuestaoGeradaDB.dificuldade == request.dificuldade,
        QuestaoGeradaDB.tipo == request.tipo,
        QuestaoGeradaDB.created_at >= cutoff,
    )
    if professor_id:
        query = query.filter(QuestaoGeradaDB.professor_id == professor_id)
    if request.recent_ids:
        query = query.filter(QuestaoGeradaDB.id.notin_(request.recent_ids))
    candidatas = query.all()
    if len(candidatas) >= request.quantidade:
        return random.sample(candidatas, request.quantidade)
    return None


async def generate_and_stream(request: GenerateRequest, db, professor_id: int = None):
    # Tenta retornar do cache antes de chamar a IA
    cached = await asyncio.to_thread(_check_cache_sync, request, db, professor_id)
    if cached:
        await registrar_evento_async(
            "geracao_cache",
            f"Cache hit: {request.materia} / {request.assunto} ({request.dificuldade}, {request.tipo})",
            {"assunto_id": request.assunto_id, "dificuldade": request.dificuldade, "tipo": request.tipo},
        )
        for q in cached:
            yield json.dumps(Question(
                id=q.id,
                enunciado=q.enunciado,
                diagrama=q.diagrama,
                alternativas=q.alternativas if isinstance(q.alternativas, list) else [],
                resposta_correta=q.resposta_correta,
                explicacao=q.explicacao,
                dificuldade=q.dificuldade,
                tipo=q.tipo,
                tags=q.tags or [],
            ).dict()) + "\n"
        return

    template = _PROMPTS.get(request.tipo, _PROMPT_MULTIPLA_ESCOLHA)
    serie_ctx = f", Série: {request.serie}" if request.serie else ""
    prompt = template.format(
        assunto=request.assunto,
        materia=request.materia,
        dificuldade=request.dificuldade,
        quantidade=request.quantidade,
        serie_ctx=serie_ctx,
    )
    if request.recent_ids:
        ids_str = ", ".join(str(i) for i in request.recent_ids[:20])
        prompt += f"\n\nIMPORTANTE: Gere questões com contextos e abordagens DIFERENTES das já geradas nesta sessão (IDs {ids_str}). Evite repetir o mesmo enunciado ou situação."

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
        raw_text = response.text.strip()
        try:
            questions_data, _ = json.JSONDecoder().raw_decode(raw_text)
        except json.JSONDecodeError:
            # Gemini sometimes produces invalid escape sequences (e.g. \s in \sqrt, \c in \cdot).
            # Fix by doubling any backslash not followed by a valid JSON escape char.
            fixed = re.sub(r'\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})', r'\\\\', raw_text)
            try:
                questions_data, _ = json.JSONDecoder().raw_decode(fixed)
            except json.JSONDecodeError as e2:
                print(f"JSON inválido mesmo após repair. Primeiros 500 chars: {raw_text[:500]!r}")
                raise e2
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
            if request.tipo not in ("misto",):
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
