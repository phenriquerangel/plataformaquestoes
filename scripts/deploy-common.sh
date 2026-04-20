#!/bin/bash
# Lógica compartilhada entre deploy.sh (kind) e deploy-mac.sh (Docker Desktop).
# Não execute este arquivo diretamente — ele é sourced pelos scripts de plataforma.

check_prerequisites() {
    echo "Verificando pré-requisitos..."
    command -v docker &> /dev/null || { echo "ERRO: 'docker' não encontrado."; exit 1; }
    command -v kubectl &> /dev/null || { echo "ERRO: 'kubectl' não encontrado."; exit 1; }
    for dir in backend frontend pdf-renderer; do
        [ -d "./$dir" ] || { echo "ERRO: Pasta './$dir' não encontrada. Execute da raiz do projeto."; exit 1; }
    done
    echo "Pré-requisitos OK."
    echo
}

clean_deployments() {
    echo "Limpando deployments anteriores (banco de dados preservado)..."
    kubectl delete --ignore-not-found=true deployment backend-questions &
    kubectl delete --ignore-not-found=true service backend-questions-service &
    kubectl delete --ignore-not-found=true deployment pdf-renderer &
    kubectl delete --ignore-not-found=true service pdf-renderer-service &
    kubectl delete --ignore-not-found=true deployment frontend-questions &
    kubectl delete --ignore-not-found=true service frontend-service &
    wait
    echo
}

build_images() {
    local sha=$1
    echo "Build das imagens Docker (paralelo)..."

    docker build --no-cache -t backend-questions:${sha} -t backend-questions:latest ./backend &
    local pid_backend=$!

    docker build --no-cache -t pdf-renderer:${sha} -t pdf-renderer:latest ./pdf-renderer &
    local pid_pdf=$!

    docker build --no-cache -t frontend-questions:${sha} -t frontend-questions:latest ./frontend &
    local pid_frontend=$!

    docker pull postgres:15-alpine &
    local pid_postgres=$!

    wait $pid_backend   || { echo "ERRO: Falha no build do backend."; exit 1; }
    wait $pid_pdf       || { echo "ERRO: Falha no build do pdf-renderer."; exit 1; }
    wait $pid_frontend  || { echo "ERRO: Falha no build do frontend."; exit 1; }
    wait $pid_postgres  || { echo "AVISO: Falha ao baixar postgres:15-alpine."; }
    echo
}

apply_manifests() {
    echo "Aplicando manifestos Kubernetes..."
    kubectl apply -f k8s/secrets.yaml
    kubectl apply -f k8s/postgres-deploy.yaml &
    kubectl apply -f k8s/backend-deploy.yaml &
    kubectl apply -f k8s/pdf-renderer-deploy.yaml &
    kubectl apply -f k8s/frontend-deploy.yaml &
    wait
    echo
}

set_images_sha() {
    local sha=$1
    kubectl set image deployment/backend-questions  backend-questions=backend-questions:${sha} &
    kubectl set image deployment/pdf-renderer       pdf-renderer=pdf-renderer:${sha} &
    kubectl set image deployment/frontend-questions frontend-questions=frontend-questions:${sha} &
    wait
}

wait_rollouts() {
    echo "Aguardando rollout..."
    kubectl rollout status deployment/backend-questions  --timeout=120s &
    kubectl rollout status deployment/pdf-renderer       --timeout=120s &
    kubectl rollout status deployment/frontend-questions --timeout=120s &
    wait
    echo
}

print_summary() {
    local sha=$1
    echo "Deploy concluído! SHA: $sha"
    echo "Pods ativos:"
    kubectl get pods
    echo
    echo "Para acessar: kubectl port-forward svc/frontend-service 8080:80"
}
