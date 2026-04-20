import os

import httpx
from auth import require_admin
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import String, func, text
from sqlalchemy.orm import Session

from config import PDF_RENDERER_TIMEOUT_SECONDS, PDF_RENDERER_URL
from database import get_db
from models import AssuntoDB, EventoLogDB, MateriaDB, PdfRequest, QuestaoGeradaDB, SerieDB

router = APIRouter(tags=["Admin"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "ok"
    db_error = None
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "error"
        db_error = str(e)

    gemini_key = os.getenv("GEMINI_API_KEY", "")
    gemini_status = "ok" if gemini_key else "not_configured"

    overall = "ok" if db_status == "ok" and gemini_status == "ok" else "degraded"

    result = {
        "status": overall,
        "components": {
            "api":      {"status": "ok"},
            "database": {"status": db_status},
            "gemini":   {"status": gemini_status, "key_configured": bool(gemini_key)},
        },
    }
    if db_error:
        result["components"]["database"]["error"] = db_error
    return result


@router.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db), _=Depends(require_admin)):
    try:
        total_materias = db.query(func.count(MateriaDB.id)).scalar()
        total_assuntos = db.query(func.count(AssuntoDB.id)).scalar()
        total_questoes = db.query(func.count(QuestaoGeradaDB.id)).scalar()
        diff_stats = (
            db.query(QuestaoGeradaDB.dificuldade, func.count(QuestaoGeradaDB.id))
            .group_by(QuestaoGeradaDB.dificuldade)
            .all()
        )
        por_dificuldade = {d: c for d, c in diff_stats if d}
        materia_stats = (
            db.query(MateriaDB.nome, func.count(QuestaoGeradaDB.id))
            .join(AssuntoDB, MateriaDB.id == AssuntoDB.materia_id)
            .join(QuestaoGeradaDB, AssuntoDB.id == QuestaoGeradaDB.assunto_id)
            .group_by(MateriaDB.nome)
            .all()
        )
        por_materia = {nome: count for nome, count in materia_stats}
    except Exception:
        total_materias = total_assuntos = total_questoes = 0
        por_dificuldade = {}
        por_materia = {}

    return {
        "total_materias": total_materias,
        "total_assuntos": total_assuntos,
        "total_questoes": total_questoes,
        "por_dificuldade": por_dificuldade,
        "por_materia": por_materia,
    }


@router.get("/admin/logs")
def listar_logs(
    tipo: str = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    query = db.query(EventoLogDB)
    if tipo:
        query = query.filter(EventoLogDB.tipo == tipo)
    total = query.count()
    logs = query.order_by(EventoLogDB.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "logs": [
            {
                "id": l.id,
                "tipo": l.tipo,
                "descricao": l.descricao,
                "extra": l.extra,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ],
        "total": total,
    }


def _enunciado_preview(enunciado, max_len=90):
    if isinstance(enunciado, str):
        return enunciado[:max_len]
    if isinstance(enunciado, list):
        parts = [p.get("content", "") for p in enunciado if isinstance(p, dict) and p.get("type") != "formula"]
        return " ".join(parts)[:max_len]
    return str(enunciado)[:max_len]


@router.get("/admin/questoes")
def listar_questoes_admin(
    materia_id: int = Query(None),
    assunto_id: int = Query(None),
    keyword: str = Query(None),
    dificuldade: str = Query(None),
    limit: int = Query(10),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    query = (
        db.query(QuestaoGeradaDB, AssuntoDB.nome.label("assunto_nome"), MateriaDB.nome.label("materia_nome"))
        .join(AssuntoDB, QuestaoGeradaDB.assunto_id == AssuntoDB.id)
        .join(MateriaDB, AssuntoDB.materia_id == MateriaDB.id)
    )
    if materia_id:
        query = query.filter(MateriaDB.id == materia_id)
    if assunto_id:
        query = query.filter(AssuntoDB.id == assunto_id)
    if dificuldade:
        query = query.filter(QuestaoGeradaDB.dificuldade == dificuldade)
    if keyword:
        query = query.filter(
            QuestaoGeradaDB.enunciado.cast(String).ilike(f"%{keyword}%")
        )

    total = query.count()
    results = query.order_by(QuestaoGeradaDB.id.desc()).offset(offset).limit(limit).all()

    questoes = [
        {
            "id": q.id,
            "enunciado_preview": _enunciado_preview(q.enunciado),
            "dificuldade": q.dificuldade or "—",
            "resposta_correta": q.resposta_correta or "—",
            "assunto_id": q.assunto_id,
            "assunto_nome": assunto_nome,
            "materia_nome": materia_nome,
        }
        for q, assunto_nome, materia_nome in results
    ]
    return {"questoes": questoes, "total": total}


_BNCC_DATA = {
    "1º Ano EF": {
        "Língua Portuguesa": ["Consciência fonológica e fonêmica", "Leitura e escrita do nome próprio", "Produção de escrita espontânea", "Compreensão de textos orais e escritos", "Poemas e cantigas: ritmo e rima"],
        "Matemática": ["Números de 0 a 10", "Contagem e cardinalidade", "Adição e subtração até 10", "Figuras geométricas planas", "Medidas de comprimento e massa (comparação)"],
        "Ciências": ["Corpo humano: partes do corpo", "Características dos seres vivos", "Plantas e animais do cotidiano", "Dia e noite: Sol e Lua", "Materiais e suas propriedades"],
        "História": ["Minha história e a história da minha família", "A vida em comunidade: escola e bairro", "Memória e tradições familiares"],
        "Geografia": ["O eu, o outro e o nós", "O sujeito e seu lugar no mundo", "A cidade e o campo"],
        "Arte": ["Artes visuais: ponto, linha e cor", "Teatro e expressão corporal", "Música: sons do cotidiano"],
        "Educação Física": ["Brincadeiras e jogos populares", "Corpo e movimento", "Expressão corporal e dança"],
    },
    "2º Ano EF": {
        "Língua Portuguesa": ["Leitura de palavras e frases", "Produção de textos curtos", "Ortografia: sílabas simples e complexas", "Parlendas, trava-línguas e adivinhas", "Compreensão leitora de contos"],
        "Matemática": ["Números de 0 a 100", "Adição e subtração com reserva", "Sequências numéricas", "Sólidos geométricos no cotidiano", "Sistema monetário brasileiro"],
        "Ciências": ["Ciclo da água", "Animais: características e hábitos", "Plantas: partes e funções", "Saúde e higiene pessoal", "O solo e os seres vivos"],
        "História": ["A escola e suas histórias", "Grupos familiares e comunitários", "Trabalho e vida cotidiana"],
        "Geografia": ["Paisagens naturais e urbanas", "O bairro: espaço de convivência", "Recursos naturais e uso sustentável"],
        "Arte": ["Desenho e pintura", "Escultura com materiais variados", "Apreciação musical"],
        "Educação Física": ["Jogos e brincadeiras tradicionais", "Atletismo: correr, saltar, arremessar", "Ginástica exploratória"],
    },
    "3º Ano EF": {
        "Língua Portuguesa": ["Gêneros textuais: conto, notícia, carta", "Produção de texto com coerência", "Pontuação básica", "Interpretação de textos informativos", "Ortografia e gramática elementar"],
        "Matemática": ["Números até 1.000", "Multiplicação e divisão", "Frações: metade, terço, quarto", "Perímetro de figuras planas", "Calendário e medidas de tempo"],
        "Ciências": ["Estados da matéria", "Cadeia alimentar", "Preservação do meio ambiente", "O Sistema Solar", "Produção de alimentos e agricultura"],
        "História": ["Povos indígenas do Brasil", "A história local e regional", "Patrimônio histórico e cultural"],
        "Geografia": ["Mapas e orientação espacial", "Os biomas brasileiros", "Populações e territórios"],
        "Arte": ["Arte popular brasileira", "Folclore e cultura regional", "Ritmos e instrumentos musicais"],
        "Educação Física": ["Esportes coletivos: regras e jogo", "Atividades aquáticas", "Lutas e artes marciais (conceitos)"],
    },
    "4º Ano EF": {
        "Língua Portuguesa": ["Substantivos, adjetivos e verbos", "Tipos de textos: narrativo, descritivo, injuntivo", "Parágrafo e coesão textual", "Leitura e interpretação de poemas", "Reescrita e revisão de textos"],
        "Matemática": ["Números até 10.000", "As quatro operações", "Números decimais: décimos e centésimos", "Ângulos e polígonos", "Área e perímetro"],
        "Ciências": ["Fenômenos naturais: chuva, vento, temperatura", "Seres vivos: classificação básica", "Propriedades dos materiais", "Saúde e doenças: prevenção", "Energia: formas e transformações"],
        "História": ["Formação do território brasileiro", "Populações africanas e afro-brasileiras", "Trabalho e escravidão no Brasil colonial"],
        "Geografia": ["Regiões do Brasil", "Urbanização e campo", "Recursos hídricos e bacias hidrográficas"],
        "Arte": ["Artes visuais: releitura e criação", "Cinema e fotografia como arte", "Música: elementos e composição"],
        "Educação Física": ["Esportes de raquete", "Jogos estratégicos", "Saúde, corpo e atividade física"],
    },
    "5º Ano EF": {
        "Língua Portuguesa": ["Concordância nominal e verbal", "Pontuação e período composto", "Gêneros: reportagem, entrevista, artigo de opinião", "Leitura crítica e inferência", "Produção de texto argumentativo inicial"],
        "Matemática": ["Números racionais e operações", "Potenciação e radiciação (introdução)", "Porcentagem", "Prismas e pirâmides", "Estatística: tabelas e gráficos simples"],
        "Ciências": ["Ecossistemas e biodiversidade", "Astronomia: Terra, Lua e Sol", "Nutrição e sistema digestório", "Tecnologia e ciência no cotidiano", "Poluição e sustentabilidade"],
        "História": ["Brasil Império", "Proclamação da República", "Movimentos sociais no século XIX"],
        "Geografia": ["Globalização e comércio internacional", "Migrações e populações", "Questões ambientais globais"],
        "Arte": ["Patrimônio artístico-cultural", "Arte digital e mídias", "Dança: estilos e expressão"],
        "Educação Física": ["Esportes radicais (conceitos e segurança)", "Atividades rítmicas", "Jogos eletrônicos e saúde"],
    },
    "6º Ano EF": {
        "Língua Portuguesa": ["Morfologia: classes de palavras", "Período simples e composto", "Gêneros: conto, crônica, mito, lenda", "Linguagem formal e informal", "Produção de narrativas"],
        "Matemática": ["Números inteiros e operações", "Múltiplos e divisores, MMC e MDC", "Frações e operações", "Plano cartesiano", "Expressões algébricas (introdução)"],
        "Ciências": ["Célula: estrutura e função", "Seres vivos: classificação dos cinco reinos", "Saúde e nutrição: nutrientes", "Substâncias e misturas", "Astronomia e universo"],
        "História": ["Pré-história e as primeiras civilizações", "Egito Antigo", "Mesopotâmia e Pérsia", "Grécia Antiga", "Roma Antiga"],
        "Geografia": ["Cartografia e leitura de mapas", "Relevo e hidrografia do Brasil", "Clima e vegetação", "Dinâmica populacional"],
        "Arte": ["História da arte: arte rupestre ao Renascimento", "Escultura e arquitetura", "Música: escalas e acordes"],
        "Língua Inglesa": ["Alfabeto e pronúncia", "Cumprimentos e apresentações", "Números, cores e objetos da sala de aula", "Verbos to be e to have", "Rotina diária: simple present"],
        "Educação Física": ["Esportes de invasão: futebol, basquete, handebol", "Ginástica artística (elementos)", "Corpo, saúde e qualidade de vida"],
    },
    "7º Ano EF": {
        "Língua Portuguesa": ["Sintaxe: sujeito e predicado", "Complementos verbais e nominais", "Gêneros: notícia, reportagem, artigo de opinião", "Figuras de linguagem", "Produção de texto dissertativo-argumentativo"],
        "Matemática": ["Números racionais: operações e representações", "Razão e proporção", "Regra de três simples e composta", "Equações do 1º grau", "Geometria plana: triângulos e quadriláteros"],
        "Ciências": ["Fisiologia: sistemas do corpo humano", "Reprodução dos seres vivos", "Puberdade e sexualidade", "Química: átomo e tabela periódica (introdução)", "Ecologia: relações ecológicas"],
        "História": ["Idade Média: feudalismo", "Cruzadas e expansão islâmica", "Renascimento cultural e científico", "Reforma Protestante", "Grandes Navegações"],
        "Geografia": ["Dinâmica da natureza: tectônica, vulcanismo e sismos", "Clima e biomas mundiais", "Europa: aspectos geográficos e geopolíticos", "Ásia e Oceania"],
        "Arte": ["Arte barroca e rococó", "Arte sacra e arte popular", "Teatro: texto e encenação"],
        "Língua Inglesa": ["Simple past: verbos regulares e irregulares", "There is / there are", "Descrição de lugares", "Reading: textos curtos informativos", "Habilidades: listening e speaking básico"],
        "Educação Física": ["Esportes de rede/parede: vôlei, tênis", "Capoeira: história e movimentos", "Atividade física e saúde mental"],
    },
    "8º Ano EF": {
        "Língua Portuguesa": ["Orações coordenadas e subordinadas", "Regência verbal e nominal", "Gêneros: editorial, carta argumentativa, seminário", "Literatura brasileira: Romantismo", "Estilística: conotação e denotação"],
        "Matemática": ["Potências e raízes", "Equações do 2º grau", "Teorema de Pitágoras", "Funções lineares e quadráticas (introdução)", "Probabilidade e estatística"],
        "Ciências": ["Física: ondas, som e luz", "Eletricidade e eletromagnetismo (introdução)", "Química orgânica: carbono e hidrocarbonetos", "Evolução biológica: Darwin", "Genética: DNA e hereditariedade (introdução)"],
        "História": ["Iluminismo e Revolução Francesa", "Revolução Industrial", "Independências na América Latina", "Imperialismo e neocolonialismo", "Brasil: do Império à República"],
        "Geografia": ["América: aspectos físicos, políticos e econômicos", "África: aspectos geográficos e geopolíticos", "Geopolítica mundial", "Questões ambientais e desenvolvimento sustentável"],
        "Arte": ["Arte moderna: impressionismo e vanguardas", "Fotografia e cinema como linguagem artística", "Música popular brasileira"],
        "Língua Inglesa": ["Present perfect", "Comparativos e superlativos", "Textos literários em inglês", "Debate e argumentação em inglês", "Escrita: paragraphs e essays simples"],
        "Educação Física": ["Esportes de precisão: golfe, boliche, xadrez", "Dança de salão", "Mídia, esporte e consumo"],
    },
    "9º Ano EF": {
        "Língua Portuguesa": ["Crase e pontuação avançada", "Período composto por subordinação", "Literatura: Realismo e Naturalismo", "Gêneros: dissertação, resumo, resenha", "Análise crítica de textos midiáticos"],
        "Matemática": ["Números reais e irracionais", "Equações e sistemas do 2º grau", "Geometria espacial: volumes", "Trigonometria: seno, cosseno e tangente", "Análise combinatória e probabilidade"],
        "Ciências": ["Física: energia, trabalho e potência", "Física: gravitação e leis de Newton", "Química: ligações químicas e reações", "Biologia: genética mendeliana", "Biotecnologia e bioética"],
        "História": ["Primeira e Segunda Guerras Mundiais", "Revolução Russa e Guerra Fria", "Brasil na Era Vargas e República Nova", "Ditadura Militar brasileira", "Redemocratização e Constituição de 1988"],
        "Geografia": ["Globalização econômica", "Conflitos geopolíticos contemporâneos", "Questão ambiental e acordos internacionais", "Brasil no cenário mundial"],
        "Arte": ["Arte contemporânea", "Instalações e arte digital", "Teatro e performance contemporânea"],
        "Língua Inglesa": ["Passive voice", "Conditionals", "Leitura e interpretação de textos complexos", "Redação: formal and informal writing", "Vocabulário temático: tecnologia, meio ambiente"],
        "Educação Física": ["Treinamento físico e periodização", "Esportes adaptados e paradesporto", "Ética no esporte"],
    },
    "1º Ano EM": {
        "Língua Portuguesa": ["Morfossintaxe: análise sintática completa", "Literatura: Trovadorismo e Humanismo", "Literatura: Classicismo e Quinhentismo", "Gêneros discursivos: artigo de opinião, editorial", "Variação linguística e norma culta"],
        "Matemática": ["Conjuntos e lógica matemática", "Funções: conceito, domínio e imagem", "Função afim e quadrática", "Função exponencial e logarítmica", "Progressões aritméticas e geométricas"],
        "Biologia": ["Citologia: estrutura e função da célula", "Divisão celular: mitose e meiose", "Histologia: tecidos animais", "Embriologia e desenvolvimento", "Vírus, bactérias e protistas"],
        "Física": ["Cinemática: MRU e MRUV", "Leis de Newton e dinâmica", "Trabalho, energia e potência", "Impulso e quantidade de movimento", "Gravitação universal"],
        "Química": ["Estrutura atômica e tabela periódica", "Ligações químicas", "Funções inorgânicas: ácidos, bases, sais e óxidos", "Reações químicas e balanceamento", "Soluções e concentração"],
        "História": ["Antiguidade: Grécia e Roma", "Feudalismo e Idade Média", "Renascimento e Reforma Protestante", "Grandes Navegações e colonização", "Absolutismo e Iluminismo"],
        "Geografia": ["Cartografia: projeções e escalas", "Dinâmica interna da Terra: tectônica", "Clima e meteorologia", "Hidrografia e bacias hidrográficas", "Geopolítica: organizações internacionais"],
        "Filosofia": ["O que é filosofia: origem e método", "Filosofia pré-socrática", "Sócrates, Platão e Aristóteles", "Epistemologia: como conhecemos?", "Ética clássica e contemporânea"],
        "Sociologia": ["O que é sociologia: objeto de estudo", "Auguste Comte e o positivismo", "Karl Marx: classes e conflito social", "Émile Durkheim: fatos sociais e solidariedade", "Max Weber: ação social e burocracia"],
        "Língua Inglesa": ["Reading strategies: skimming e scanning", "Gramática: tenses review", "Vocabulary building: academic words", "Writing: essays e argumentative texts", "Listening: podcasts e notícias"],
        "Arte": ["Arte clássica: Grécia e Roma", "Arte medieval e renascentista", "Arte barroca e neoclássica", "Estética e filosofia da arte"],
        "Educação Física": ["Esportes coletivos de alto rendimento", "Biomecânica e fundamentos do esporte", "Saúde, qualidade de vida e atividade física"],
    },
    "2º Ano EM": {
        "Língua Portuguesa": ["Literatura: Barroco e Arcadismo", "Literatura: Romantismo brasileiro", "Semântica e estilística", "Redação ENEM: estrutura e competências", "Coesão e coerência textual"],
        "Matemática": ["Trigonometria: funções e equações trigonométricas", "Geometria plana: áreas e perímetros", "Geometria espacial: sólidos e volumes", "Geometria analítica: ponto, reta e circunferência", "Estatística e probabilidade"],
        "Biologia": ["Fungos, algas e briófitas", "Pteridófitas, gimnospermas e angiospermas", "Fisiologia vegetal", "Zoologia: poríferos, cnidários e platelmintos", "Zoologia: aves e mamíferos"],
        "Física": ["Termodinâmica: calor e temperatura", "Óptica geométrica: reflexão e refração", "Ondulatória: ondas mecânicas e eletromagnéticas", "Eletrostática: cargas e campo elétrico", "Eletrodinâmica: corrente e resistência"],
        "Química": ["Estequiometria e cálculos químicos", "Termoquímica: entalpia e calor de reação", "Cinética química: velocidade de reação", "Equilíbrio químico", "Eletroquímica: pilhas e eletrólise"],
        "História": ["Revolução Francesa e Napoleão", "Revolução Industrial e capitalismo", "Imperialismo e Primeira Guerra Mundial", "Revolução Russa e socialismo", "Brasil: da Independência ao Segundo Reinado"],
        "Geografia": ["Geopolítica contemporânea: conflitos e blocos", "Economia mundial: capitalismo e globalização", "Urbanização mundial e problemas urbanos", "Questões ambientais: desmatamento, poluição", "Migrações internacionais"],
        "Filosofia": ["Filosofia política: Hobbes, Locke e Rousseau", "Kant: razão e moral", "Existencialismo: Sartre e Beauvoir", "Filosofia da linguagem", "Bioética e tecnoética"],
        "Sociologia": ["Cultura, identidade e diversidade", "Gênero, sexualidade e sociedade", "Movimentos sociais e democracia", "Globalização e desigualdades", "Mídia e sociedade do espetáculo"],
        "Língua Inglesa": ["Advanced grammar: subjunctive, inversions", "Academic reading: articles and reports", "Business English e vocabulário profissional", "Pronunciation e fluência oral", "IELTS/TOEFL preparation (introdução)"],
        "Arte": ["Arte moderna: impressionismo, expressionismo, cubismo", "Arte brasileira: modernismo semana de 1922", "Cinema e linguagem audiovisual", "Arte e tecnologia"],
        "Educação Física": ["Nutrição esportiva", "Treinamento funcional", "Esportes de aventura e natureza"],
    },
    "3º Ano EM": {
        "Língua Portuguesa": ["Literatura: Realismo, Naturalismo e Parnasianismo", "Literatura: Simbolismo e Pré-Modernismo", "Literatura: Modernismo e Contemporaneidade", "Redação ENEM: temas e modelos de referência", "Análise de textos literários e não-literários"],
        "Matemática": ["Revisão: funções e equações", "Revisão: trigonometria e geometria analítica", "Contagem: permutação, combinação e arranjo", "Probabilidade: eventos e distribuições", "Matemática financeira: juros e amortizações"],
        "Biologia": ["Ecologia: biomas e ecossistemas", "Fluxo de energia e ciclos biogeoquímicos", "Genética: 2ª e 3ª leis de Mendel", "Genética molecular: DNA, RNA e síntese proteica", "Evolução: neodarwinismo e especiação"],
        "Física": ["Eletromagnetismo: campo magnético e indução", "Física moderna: relatividade especial", "Física moderna: teoria quântica e radioatividade", "Física nuclear e energia atômica", "Revisão: mecânica, termodinâmica e óptica"],
        "Química": ["Química orgânica: hidrocarbonetos", "Funções orgânicas: álcoois, aldeídos, cetonas, ácidos", "Reações orgânicas: adição, substituição e eliminação", "Polímeros e macromoléculas", "Bioquímica: carboidratos, lipídeos e proteínas"],
        "História": ["Segunda Guerra Mundial e Holocausto", "Guerra Fria: bipolaridade e conflitos", "Descolonização da Ásia e África", "Brasil: ditadura militar e redemocratização", "Mundo contemporâneo: pós-Guerra Fria e globalização"],
        "Geografia": ["Revisão: geopolítica e blocos econômicos", "Questão ambiental e acordos de Paris", "BRICS e países emergentes", "Conflitos étnicos e religiosos", "Brasil: desigualdade, desenvolvimento e sustentabilidade"],
        "Filosofia": ["Filosofia da ciência: Popper e Kuhn", "Filosofia do direito e justiça social", "Dilemas éticos contemporâneos", "Filosofia da mente e inteligência artificial", "Revisão: grandes temas filosóficos"],
        "Sociologia": ["Stratificação social e mobilidade", "Trabalho, tecnologia e desemprego estrutural", "Direitos humanos e cidadania", "Democracia, autoritarismo e populismo", "Revisão: teorias sociológicas clássicas e contemporâneas"],
        "Língua Inglesa": ["Critical thinking in English", "Literature in English: Shakespeare to contemporary", "Global issues: environment, politics, technology", "Presentations e public speaking", "Writing: research papers e dissertations"],
        "Arte": ["Arte contemporânea e pós-moderna", "Cultura pop e indústria cultural", "Arte e mercado: curadoria e crítica", "Projeto artístico pessoal"],
        "Educação Física": ["Planejamento de atividade física para a vida", "Esporte, mídia e sociedade", "Primeiros socorros em atividades físicas"],
    },
}


@router.post("/admin/seed-bncc")
def seed_bncc(db: Session = Depends(get_db), _=Depends(require_admin)):
    series_criadas = assuntos_criados = materias_criadas = 0
    erros = []

    try:
        for serie_nome, materias_dict in _BNCC_DATA.items():
            serie = db.query(SerieDB).filter(SerieDB.nome == serie_nome).first()
            if not serie:
                serie = SerieDB(nome=serie_nome)
                db.add(serie)
                db.flush()
                series_criadas += 1

            for materia_nome, assuntos_lista in materias_dict.items():
                materia = db.query(MateriaDB).filter(MateriaDB.nome == materia_nome).first()
                if not materia:
                    materia = MateriaDB(nome=materia_nome)
                    db.add(materia)
                    db.flush()
                    materias_criadas += 1

                for assunto_nome in assuntos_lista:
                    existe = db.query(AssuntoDB).filter(
                        AssuntoDB.nome == assunto_nome,
                        AssuntoDB.materia_id == materia.id,
                        AssuntoDB.serie_id == serie.id,
                    ).first()
                    if not existe:
                        db.add(AssuntoDB(
                            nome=assunto_nome,
                            materia_id=materia.id,
                            serie=serie_nome,
                            serie_id=serie.id,
                        ))
                        assuntos_criados += 1

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao importar BNCC: {e}")

    return {
        "series_criadas": series_criadas,
        "materias_criadas": materias_criadas,
        "assuntos_criados": assuntos_criados,
        "mensagem": f"BNCC importado: {series_criadas} séries, {materias_criadas} matérias, {assuntos_criados} assuntos criados.",
    }


@router.post("/export-pdf")
async def export_pdf_endpoint(request: PdfRequest, _=Depends(require_admin)):
    try:
        async with httpx.AsyncClient(timeout=PDF_RENDERER_TIMEOUT_SECONDS) as client:
            response = await client.post(PDF_RENDERER_URL, json=request.dict())

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail="Erro no serviço de renderização de PDF.",
            )

        return StreamingResponse(iter([response.content]), media_type="application/pdf")

    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Não foi possível conectar ao serviço de PDF: {e}")
