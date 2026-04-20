@echo off
setlocal

REM --- Tag unica por build (timestamp) ---
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd-HHmmss'"') do set BUILD_TAG=%%i
echo Deploy ^| BUILD_TAG: %BUILD_TAG%
echo.

REM --- Pre-requisitos ---
echo Verificando pre-requisitos...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: docker nao encontrado. Instale o Docker Desktop.
    exit /b 1
)
kubectl version --client >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: kubectl nao encontrado.
    exit /b 1
)
if not exist ".\backend"      ( echo ERRO: pasta backend nao encontrada.      & exit /b 1 )
if not exist ".\frontend"     ( echo ERRO: pasta frontend nao encontrada.     & exit /b 1 )
if not exist ".\pdf-renderer" ( echo ERRO: pasta pdf-renderer nao encontrada. & exit /b 1 )
echo Pre-requisitos OK.
echo.

REM --- Build das imagens (sem cache, com tag unica + latest) ---
echo Buildando imagens Docker (sem cache)...

docker build --no-cache -t backend-questions:%BUILD_TAG%  -t backend-questions:latest  ./backend
if %errorlevel% neq 0 ( echo ERRO: Falha no build do backend.      & exit /b 1 )

docker build --no-cache -t pdf-renderer:%BUILD_TAG%       -t pdf-renderer:latest       ./pdf-renderer
if %errorlevel% neq 0 ( echo ERRO: Falha no build do pdf-renderer. & exit /b 1 )

docker build --no-cache -t frontend-questions:%BUILD_TAG% -t frontend-questions:latest ./frontend
if %errorlevel% neq 0 ( echo ERRO: Falha no build do frontend.     & exit /b 1 )
echo.

REM --- Carregar imagens no cluster Kind ---
echo Carregando imagens no cluster Kind...
set KIND_CLUSTER_NAME=plataforma-questoes

kind load docker-image backend-questions:%BUILD_TAG% --name %KIND_CLUSTER_NAME%
if %errorlevel% neq 0 ( echo AVISO: Falha ao carregar imagem do backend no Kind. )

kind load docker-image pdf-renderer:%BUILD_TAG% --name %KIND_CLUSTER_NAME%
if %errorlevel% neq 0 ( echo AVISO: Falha ao carregar imagem do pdf-renderer no Kind. )

kind load docker-image frontend-questions:%BUILD_TAG% --name %KIND_CLUSTER_NAME%
if %errorlevel% neq 0 ( echo AVISO: Falha ao carregar imagem do frontend no Kind. )
echo.

REM --- Aplicar secrets e manifestos ---
echo Aplicando secrets e manifestos Kubernetes...
kubectl apply -f k8s/secrets.yaml
if %errorlevel% neq 0 ( echo ERRO: Falha ao aplicar secrets.           & exit /b 1 )

kubectl apply -f k8s/postgres-deploy.yaml
kubectl apply -f k8s/backend-deploy.yaml
kubectl apply -f k8s/pdf-renderer-deploy.yaml
kubectl apply -f k8s/frontend-deploy.yaml
echo.

REM --- Atualizar deployments para a tag unica (forca restart) ---
echo Atualizando imagens para tag %BUILD_TAG%...
kubectl set image deployment/backend-questions backend-questions=backend-questions:%BUILD_TAG%
if %errorlevel% neq 0 ( echo ERRO: Falha ao atualizar imagem do backend. & exit /b 1 )

kubectl set image deployment/pdf-renderer pdf-renderer=pdf-renderer:%BUILD_TAG%
if %errorlevel% neq 0 ( echo ERRO: Falha ao atualizar imagem do pdf-renderer. & exit /b 1 )

kubectl set image deployment/frontend-questions frontend-questions=frontend-questions:%BUILD_TAG%
if %errorlevel% neq 0 ( echo ERRO: Falha ao atualizar imagem do frontend. & exit /b 1 )
echo.

REM --- Forcar o reinicio dos deployments ---
echo Forcando o reinicio dos deployments...
kubectl rollout restart deployment/backend-questions
kubectl rollout restart deployment/pdf-renderer
kubectl rollout restart deployment/frontend-questions
echo.

REM --- Aguardar rollout ---
echo Aguardando pods subirem...
kubectl rollout status deployment/backend-questions  --timeout=180s
kubectl rollout status deployment/pdf-renderer       --timeout=180s
kubectl rollout status deployment/frontend-questions --timeout=180s
echo.

REM --- Resumo ---
echo Deploy concluido! TAG: %BUILD_TAG%
echo.
kubectl get pods
echo.
echo Para acessar: kubectl port-forward svc/frontend-service 8080:80

endlocal
