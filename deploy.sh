#!/bin/bash
set -e
source "$(dirname "$0")/scripts/deploy-common.sh"

GIT_SHA=$(git rev-parse --short HEAD)
echo "Deploy (kind) | SHA: $GIT_SHA"
echo

check_prerequisites
clean_deployments
build_images "$GIT_SHA"

echo "Carregando imagens no cluster kind (paralelo)..."
kind load docker-image backend-questions:${GIT_SHA}  --name plataforma-questoes &
kind load docker-image pdf-renderer:${GIT_SHA}       --name plataforma-questoes &
kind load docker-image frontend-questions:${GIT_SHA} --name plataforma-questoes &
kind load docker-image postgres:15-alpine             --name plataforma-questoes &
wait
echo

apply_manifests
set_images_sha "$GIT_SHA"
wait_rollouts
print_summary "$GIT_SHA"

# Observabilidade — rode com MONITORING=1 ./deploy.sh para instalar/atualizar
if [ "${MONITORING}" = "1" ]; then
  echo
  bash "$(dirname "$0")/deploy-monitoring.sh"
else
  echo
  echo "Dica: rode 'MONITORING=1 ./deploy.sh' para instalar Grafana + Prometheus + Loki + Tempo."
fi
