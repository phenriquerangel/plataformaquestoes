# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Deploy

**Windows (CMD):**
```bat
deploy.bat
```

**Linux/macOS:**
```bash
bash deploy.sh
# Com monitoramento (Grafana + Prometheus + Loki + Tempo):
MONITORING=1 bash deploy.sh
```

Ambos os scripts fazem: build `--no-cache` de todas as imagens → aplicam `k8s/secrets.yaml` e os demais manifestos → `kubectl set image` com tag única → aguardam rollout. O `deploy.bat` usa timestamp como tag; o `deploy.sh` usa o git SHA.

**Acessar após deploy:**
```bash
kubectl port-forward svc/frontend-service 8080:80
# http://localhost:8080
```

**Verificar estado do cluster:**
```bash
kubectl get pods
kubectl logs -l app=backend-questions --tail=50
```

**Aplicar apenas os secrets (sem rebuild):**
```bash
kubectl apply -f k8s/secrets.yaml
```

## Desenvolvimento local

```bash
docker-compose up   # sobe postgres + backend + frontend juntos
```

O Vite proxeia `/api/*` → `http://localhost:8000` em dev.

## Arquitetura

```
backend/        FastAPI + SQLAlchemy + PostgreSQL
frontend/       React + Vite + Chakra UI
pdf-renderer/   Node.js (Puppeteer) — serviço separado para PDF
k8s/            Manifestos Kubernetes
scripts/        deploy-common.sh (lógica compartilhada de deploy)
monitoring/     Stack opcional: Grafana, Prometheus, Loki, Tempo
```

### Backend (FastAPI, porta 8000)

Roteadores em `backend/routers/` — cada domínio tem seu arquivo (`auth`, `materias`, `assuntos`, `questoes`, `listas`, `admin`, `usuarios`). A lógica de geração de IA fica em `backend/question_service.py`.

**Banco de dados:** SQLAlchemy ORM sem Alembic. O schema é criado via `Base.metadata.create_all()` no startup. Colunas adicionadas ao longo do tempo estão como `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` no evento `startup` de `main.py` — é assim que migrações são feitas neste projeto.

**Autenticação:** JWT (python-jose), expiração de 8h. O token carrega `sub` (username) e `role` (admin/user). Professores enxergam apenas seus próprios registros via filtro `professor_id`. Admins enxergam tudo.

**Geração de questões:** Google Gemini via `google-generativeai`. Retorna `StreamingResponse` com NDJSON. Suporta tipos: `multipla_escolha`, `verdadeiro_falso`, `dissertativa`, `misto`. Questões podem ter diagramas (JSONB com elementos SVG). Retry com backoff exponencial em `question_service.py`.

**Modelos principais:** `UsuarioDB`, `MateriaDB`, `AssuntoDB`, `QuestaoGeradaDB`, `ListaDB`, `ListaQuestaoAssociation` (M2M com campo `ordem`), `EventoLogDB`.

**Observabilidade:** métricas em `/metrics` (Prometheus), tracing via OpenTelemetry → Tempo (opcional), logs de eventos na tabela `eventos_log`.

### Frontend (React + Vite, porta 80)

Gerenciamento de estado via hooks customizados em `frontend/src/hooks/`. Cada domínio tem seu hook (`useListas`, `useQuestionBank`, `useQuestionGenerator`, `useCustomList`, etc.).

**Lista temporária vs. listas salvas:** `useCustomList` mantém um "carrinho" em `localStorage`. `useListas` gerencia listas permanentes no backend. O componente `CustomList` exibe o carrinho flutuante no topo de todas as páginas.

**Navegação:** controlada por estado `activePage` em `App.jsx` (não usa React Router). Transições de página via `AnimatePresence` do Framer Motion.

**Dark mode:** configurado no theme do Chakra em `main.jsx`. Toggle no `Sidebar.jsx`. Componentes usam `useColorModeValue` para alternar cores.

**Exportação PDF:** o frontend chama `POST /api/export-pdf` no backend, que repassa para o serviço `pdf-renderer` (Node.js/Puppeteer na porta 3000).

### Secrets (`k8s/secrets.yaml`)

O arquivo `k8s/secrets.yaml` **não é commitado** (está no `.gitignore`). Contém:
- `postgres-credentials`: `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `app-secrets`: `GEMINI_API_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `USER_USERNAME`, `USER_PASSWORD`, `JWT_SECRET_KEY`

Os valores padrão usados localmente estão em `k8s/postgres-deploy.yaml` (usuário `admin`, senha `admin123`).
