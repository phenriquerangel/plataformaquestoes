@echo off
setlocal

REM --- Verificações de Pré-requisitos ---
echo 🧐 Verificando pré-requisitos...

REM Verifica se o comando 'docker' existe
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERRO: O comando 'docker' não foi encontrado.
    echo    Por favor, instale o Docker Desktop e garanta que ele esteja rodando.
    goto :eof
)

REM Verifica se o comando 'kubectl' existe
kubectl version --client >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERRO: O comando 'kubectl' não foi encontrado.
    echo    Por favor, instale o kubectl e garanta que ele esteja no PATH do seu sistema.
    goto :eof
)

REM Verifica se as pastas dos serviços existem
if not exist ".\backend" (
    echo ❌ ERRO: A pasta '.\backend' não foi encontrada. Execute este script a partir da raiz do projeto.
    goto :eof
)
if not exist ".\frontend" (
    echo ❌ ERRO: A pasta '.\frontend' não foi encontrada. Execute este script a partir da raiz do projeto.
    goto :eof
)
if not exist ".\pdf-renderer" (
    echo ❌ ERRO: A pasta '.\pdf-renderer' não foi encontrada. Execute este script a partir da raiz do projeto.
    goto :eof
)
echo ✅ Pré-requisitos atendidos.
echo.

echo 🧹 Garantindo um estado limpo no cluster (não afeta o banco de dados)...
kubectl delete --ignore-not-found=true deployment backend-questions
kubectl delete --ignore-not-found=true service backend-questions-service
kubectl delete --ignore-not-found=true deployment pdf-renderer
kubectl delete --ignore-not-found=true service pdf-renderer-service
kubectl delete --ignore-not-found=true deployment frontend-questions
kubectl delete --ignore-not-found=true service frontend-service
echo.

echo 🚀 Iniciando build das imagens Docker...
docker build -t backend-questions:latest ./backend || (echo "❌ ERRO: Falha no build do backend." && goto :eof)
docker build -t pdf-renderer:latest ./pdf-renderer || (echo "❌ ERRO: Falha no build do pdf-renderer." && goto :eof)
docker build -t frontend-questions:latest ./frontend || (echo "❌ ERRO: Falha no build do frontend." && goto :eof)
echo.

echo 📥 Garantindo imagem do Postgres...
docker pull postgres:15-alpine
echo.

echo ⚙️ Aplicando manifestos Kubernetes...
kubectl apply -f k8s/postgres-deploy.yaml
kubectl apply -f k8s/backend-deploy.yaml
kubectl apply -f k8s/pdf-renderer-deploy.yaml
kubectl apply -f k8s/frontend-deploy.yaml
echo.

echo ✅ Processo concluido! A aplicação está pronta.
echo    Use 'kubectl get pods' para verificar o status.
echo    Para acessar, use: kubectl port-forward svc/frontend-service 8080:80

endlocal
