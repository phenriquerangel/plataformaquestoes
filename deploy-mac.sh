#!/bin/bash
set -e
source "$(dirname "$0")/scripts/deploy-common.sh"

GIT_SHA=$(git rev-parse --short HEAD)
echo "Deploy (Docker Desktop) | SHA: $GIT_SHA"
echo

check_prerequisites
clean_deployments
build_images "$GIT_SHA"
apply_manifests
set_images_sha "$GIT_SHA"
wait_rollouts
print_summary "$GIT_SHA"
