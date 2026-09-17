#!/usr/bin/env bash
# Cloud Agent install phase — durable, idempotent repository setup.
# Installs system tooling (Docker + Supabase CLI) and Node dependencies for the
# Revolis CRM app. Per-boot services (dockerd, local Supabase, dev server) are
# started in start.sh / terminals, NOT here.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUPABASE_CLI_VERSION="2.115.0"

echo "[install] Ensuring system packages (docker, fuse-overlayfs, uidmap)..."
if ! command -v docker >/dev/null 2>&1 || ! command -v fuse-overlayfs >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    docker.io fuse-overlayfs uidmap || true
  # /etc/fuse.conf triggers an interactive dpkg prompt on some images; resolve it non-interactively.
  sudo DEBIAN_FRONTEND=noninteractive dpkg --configure -a --force-confdef --force-confold || true
fi

echo "[install] Ensuring Supabase CLI ${SUPABASE_CLI_VERSION}..."
if ! command -v supabase >/dev/null 2>&1; then
  arch="$(dpkg --print-architecture)"
  tmp_deb="$(mktemp --suffix=.deb)"
  curl -fsSL -o "$tmp_deb" \
    "https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/supabase_${SUPABASE_CLI_VERSION}_linux_${arch}.deb"
  sudo dpkg -i "$tmp_deb"
  rm -f "$tmp_deb"
fi

echo "[install] Installing CRM Node dependencies (npm ci)..."
cd "$REPO_ROOT/apps/crm"
npm ci

echo "[install] Done."
