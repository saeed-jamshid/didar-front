#!/usr/bin/env bash
# Root installs ONLY temporary read-only8086 route; main domain/CDN/TLS untouched.
set -euo pipefail
[[ $EUID == 0 ]] || { echo 'Run with sudo' >&2; exit 1; }
source=$(cd "$(dirname "$0")" && pwd)/didar-preview.conf
config=/etc/nginx/sites-available/didar-preview.conf
link=/etc/nginx/sites-enabled/didar-preview.conf
[[ -f "$source" && ! -e "$config" && ! -e "$link" && ! -L "$link" ]]
if ss -H -ltn 'sport = :8086' | grep -q .; then echo 'Port8086 busy; refusing changes' >&2; exit 1; fi
curl -fsS --max-time 10 http://127.0.0.1:3006/ >/dev/null
curl -fsS --max-time 10 http://127.0.0.1:8092/api/categories/ >/dev/null
install -m 644 "$source" "$config"
ln -s "$config" "$link"
if nginx -t && systemctl reload nginx; then
  # Only add requested preview port if host already uses UFW; never disable firewall.
  if command -v ufw >/dev/null && ufw status | grep -q '^Status: active'; then
    ufw allow 8086/tcp comment 'Didar read-only preview'
  fi
  echo 'Read-only preview: http://130.185.76.124:8086 (admin blocked; HTTP unencrypted)'
else
  rm -f -- "$link" "$config"
  nginx -t && systemctl reload nginx
  exit 1
fi
