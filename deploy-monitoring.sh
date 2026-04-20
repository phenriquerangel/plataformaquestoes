#!/bin/bash
# Deploy da stack de observabilidade: Prometheus + Grafana + Loki + Tempo
# Idempotente — seguro rodar múltiplas vezes (helm upgrade --install)
# Uso: ./deploy-monitoring.sh

set -e

NAMESPACE=monitoring

echo "=== EduQuest.ai — Observabilidade ==="
echo "    Prometheus · Grafana · Loki · Tempo"
echo

# Pré-requisitos
command -v helm    &> /dev/null || { echo "ERRO: 'helm' não encontrado."; echo "Instale: https://helm.sh/docs/intro/install/"; exit 1; }
command -v kubectl &> /dev/null || { echo "ERRO: 'kubectl' não encontrado."; exit 1; }

# Namespace
echo "Criando namespace '$NAMESPACE'..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
echo

# Helm repos
echo "Atualizando repositórios Helm..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
helm repo add grafana              https://grafana.github.io/helm-charts              2>/dev/null || true
helm repo update
echo

# 1. kube-prometheus-stack (Prometheus + Grafana + node-exporter + kube-state-metrics)
echo "[1/3] kube-prometheus-stack..."
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace $NAMESPACE \
  --values monitoring/helm/values-prometheus.yaml \
  --timeout 5m \
  --wait
echo

# 2. Loki + Promtail (logs de todos os pods, zero mudança no app)
echo "[2/3] Loki + Promtail..."
helm upgrade --install loki grafana/loki-stack \
  --namespace $NAMESPACE \
  --values monitoring/helm/values-loki.yaml \
  --timeout 3m \
  --wait
echo

# 3. Tempo (traces via OTLP)
echo "[3/3] Tempo..."
helm upgrade --install tempo grafana/tempo \
  --namespace $NAMESPACE \
  --values monitoring/helm/values-tempo.yaml \
  --timeout 3m \
  --wait
echo

# ServiceMonitor — diz ao Prometheus onde scrape o /metrics do backend
echo "Aplicando ServiceMonitor..."
kubectl apply -f monitoring/k8s/servicemonitor.yaml
echo

# Resumo
echo "================================================"
echo " Observabilidade instalada com sucesso!"
echo "================================================"
echo
echo " Para acessar o Grafana:"
echo "   kubectl port-forward -n $NAMESPACE svc/kube-prometheus-stack-grafana 3000:80"
echo "   URL:   http://localhost:3000"
echo "   Login: admin / admin"
echo
echo " Datasources configurados:"
echo "   Prometheus — métricas (golden signals)"
echo "   Loki       — logs de todos os pods"
echo "   Tempo      — traces distribuídos"
echo
echo " Dashboards pré-carregados (pasta 'EduQuest.ai'):"
echo "   FastAPI Observability  — rate · errors · latency P95/P99"
echo "   Kubernetes Cluster     — saturation · pods · namespaces"
echo "   Node Exporter          — CPU · memória · disco · rede"
echo
echo " Golden signals (PromQL de referência):"
echo "   Traffic:  rate(http_requests_total[1m])"
echo "   Errors:   rate(http_requests_total{status=~\"5..\"}[1m])"
echo "   Latency:  histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m]))"
echo "   Saturat.: container_memory_working_set_bytes / kube_node_status_capacity"
