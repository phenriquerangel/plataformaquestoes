# EduQuest.ai - Plataforma de Gestão e Geração de Questões com IA

EduQuest.ai é uma aplicação full-stack moderna projetada para professores e educadores, permitindo a geração automática de questões pedagógicas utilizando a inteligência artificial do Google Gemini, além de oferecer um sistema robusto de curadoria e organização de listas de exercícios.

## 🚀 Tecnologias Utilizadas

### Backend
- **Python & FastAPI**: Framework de alta performance para a API.
- **SQLAlchemy & PostgreSQL**: Persistência de dados com suporte a tipos nativos `JSONB`.
- **Google Gemini Pro (IA)**: Geração de conteúdo inteligente e contextualizado.
- **Pydantic**: Validação rigorosa de esquemas de dados.

### Frontend
- **React & Vite**: Ambiente de desenvolvimento e build ultra-rápido.
- **Chakra UI**: Sistema de design moderno e acessível para a interface.
- **jsPDF**: Motor de geração de documentos PDF customizados.
- **Lucide React**: Biblioteca de ícones vetoriais.

### Infraestrutura e Deploy
- **Docker**: Containerização de todos os serviços.
- **Kubernetes (K8s) & Kind**: Orquestração para escalabilidade e resiliência.
- **Nginx**: Proxy reverso e servidor de arquivos estáticos.

## 🛠️ Funcionalidades Implementadas

1.  **Gerador com IA**: Geração de até 10 questões por vez, com controle de dificuldade (Fácil, Média, Difícil).
2.  **Banco de Questões**: Sistema de busca avançada por Matéria, múltiplos Assuntos, Palavras-chave e Dificuldade.
3.  **Construtor de Listas ("Carrinho")**: Permite selecionar questões de diferentes buscas para montar uma lista personalizada.
4.  **Exportação Profissional**: Geração de PDF com layout de prova, numeração automática de páginas e gabarito anexo ao final.
5.  **Painel Admin**:
    - Dashboard com estatísticas em tempo real.
    - Gestão completa (CRUD) de Matérias e Assuntos.
    - Edição rápida de nomes e categorias.
6.  **Persistência Local**: O carrinho de questões é salvo no `localStorage` do navegador para evitar perda de dados em recarregamentos.

## 📋 Passo a Passo para Configuração (Setup)

Caso precise refazer o ambiente ou instalar em uma nova máquina, siga estes passos:

### 1. Pré-requisitos
- Docker instalado.
- Kind (Kubernetes in Docker) instalado.
- Kubectl instalado.
- Uma chave de API do Google Gemini (GEMINI_API_KEY).

### 2. Preparação do Cluster
Crie um cluster Kind (se ainda não houver):
```bash
kind create cluster --name plataforma-questoes
```

### 3. Variáveis de Ambiente
Certifique-se de que o manifesto do Kubernetes (`k8s/backend-deploy.yaml`) contenha a sua chave da IA ou configure-a no ambiente do cluster:
```yaml
env:
  - name: GEMINI_API_KEY
    value: "SUA_CHAVE_AQUI"
```

### 4. Build e Deploy Automático
Utilize os scripts de automação fornecidos para construir as imagens e subir os serviços:

**No Linux/macOS:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**No Windows:**
```batch
deploy.bat
```

O script irá:
1. Construir as imagens Docker do Frontend e Backend.
2. Carregar a imagem do Postgres no Kind.
3. Aplicar os manifestos do banco, backend e frontend.
4. Reiniciar os pods para garantir a atualização.

### 5. Acesso à Aplicação
Após o deploy, realize o encaminhamento de porta para acessar localmente:
```bash
kubectl port-forward svc/frontend-service 8080:80
```
Acesse no navegador: `http://localhost:8080`

## 📂 Estrutura do Projeto

```text
├── backend/
│   ├── main.py            # API FastAPI e Lógica de IA
│   └── Dockerfile         # Build da imagem Python
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Lógica principal e UI (Chakra UI)
│   │   ├── main.jsx       # Configuração de Tema e Provedores
│   │   └── nginx.conf     # Configuração do Proxy Reverso
│   ├── Dockerfile         # Build multi-stage (Node -> Nginx)
│   └── package.json       # Dependências do projeto
├── k8s/                   # Manifestos de Orquestração
│   ├── postgres-deploy.yaml
│   ├── backend-deploy.yaml
│   └── frontend-deploy.yaml
└── deploy.sh              # Script de automação de deploy
```

## 🛡️ Observações de Segurança
- O banco de dados utiliza credenciais padrão para fins de teste (`admin/admin123`). Para produção, altere no Secret do Kubernetes.
- O CORS está habilitado para todas as origens no ambiente de desenvolvimento.

---
*Desenvolvido com o auxílio de Gemini Code Assist.*