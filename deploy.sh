#!/bin/bash
set -e

echo "🚀 Iniciando build das imagens Docker..."
docker build -t backend-questions:latest ./backend
docker build -t frontend-questions:latest ./frontend

echo "📥 Garantindo imagem do Postgres..."
docker pull postgres:15-alpine
kind load docker-image postgres:15-alpine --name plataforma-questoes

echo "⚙️ Aplicando manifestos Kubernetes..."
kubectl apply -f k8s/postgres-deploy.yaml
kubectl apply -f k8s/backend-deploy.yaml
kubectl apply -f k8s/frontend-deploy.yaml

echo "🔄 Reiniciando os serviços para aplicar as mudanças..."
kubectl rollout restart deployment/backend-questions
kubectl rollout restart deployment/frontend-questions

echo "✅ Processo concluído! Verifique os pods com: kubectl get pods"