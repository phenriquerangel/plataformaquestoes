@echo off
REM Deploy da stack de observabilidade: Prometheus + Grafana + Loki + Tempo
REM Idempotente — seguro rodar multiplas vezes (helm upgrade --install)
REM Uso: deploy-monitoring.bat

setlocal

set NAMESPACE=monitoring

echo === EduQuest.ai — Observabilidade ===
echo     Prometheus . Grafana . Loki . Tempo
echo.

REM Pre-requisitos
where helm >nul 2>&1 || (
    echo ERRO: 'helm' nao encontrado.
    echo Instale: https://helm.sh/docs/intro/install/
    exit /b 1
)
where kubectl >nul 2>&1 || (
    echo ERRO: 'kubectl' nao encontrado.
    exit /b 1
)

REM Namespace
echo Criando namespace '%NAMESPACE%'...
kubectl create namespace %NAMESPACE% --dry-run=client -o yaml | kubectl apply -f -
echo.

REM Helm repos
echo Atualizando repositorios Helm...
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>nul
helm repo add grafana              https://grafana.github.io/helm-charts              2>nul
helm repo update
echo.

REM 1. kube-prometheus-stack
echo [1/3] kube-prometheus-stack...
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack ^
  --namespace %NAMESPACE% ^
  --values monitoring/helm/values-prometheus.yaml ^
  --timeout 5m ^
  --wait
echo.

REM 2. Loki + Promtail
echo [2/3] Loki + Promtail...
helm upgrade --install loki grafana/loki-stack ^
  --namespace %NAMESPACE% ^
  --values monitoring/helm/values-loki.yaml ^
  --timeout 3m ^
  --wait
echo.

REM 3. Tempo
echo [3/3] Tempo...
helm upgrade --install tempo grafana/tempo ^
  --namespace %NAMESPACE% ^
  --values monitoring/helm/values-tempo.yaml ^
  --timeout 3m ^
  --wait
echo.

REM ServiceMonitor
echo Aplicando ServiceMonitor...
kubectl apply -f monitoring/k8s/servicemonitor.yaml
echo.

REM Resumo
echo ================================================
echo  Observabilidade instalada com sucesso!
echo ================================================
echo.
echo  Para acessar o Grafana:
echo    kubectl port-forward -n %NAMESPACE% svc/kube-prometheus-stack-grafana 3000:80
echo    URL:   http://localhost:3000
echo    Login: admin / admin
echo.
echo  Datasources configurados:
echo    Prometheus — metricas (golden signals)
echo    Loki       — logs de todos os pods
echo    Tempo      — traces distribuidos
echo.
echo  Dashboards pre-carregados (pasta 'EduQuest.ai'):
echo    FastAPI Observability  — rate . errors . latency P95/P99
echo    Kubernetes Cluster     — saturation . pods . namespaces
echo    Node Exporter          — CPU . memoria . disco . rede
echo.
echo  Golden signals (PromQL de referencia):
echo    Traffic:  rate(http_requests_total[1m])
echo    Errors:   rate(http_requests_total{status=~"5.."}[1m])
echo    Latency:  histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m]))
echo    Saturat.: container_memory_working_set_bytes / kube_node_status_capacity

endlocal
