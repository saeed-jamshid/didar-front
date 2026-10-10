#!/usr/bin/env bash
set -euo pipefail
umask 027
release=${1:?release required}
port=${2:?port required}
backend=${3:?backend URL required}
api_required=${4:-true}
[[ "$api_required" == true || "$api_required" == false ]]
[[ "$release" =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]]
[[ "$port" =~ ^[0-9]{4,5}$ ]] && ((10#$port >= 1024 && 10#$port <= 65535))
[[ "$backend" =~ ^http://127\.0\.0\.1:([0-9]{4,5})$ ]]
backend_port=${BASH_REMATCH[1]}
((10#$backend_port >= 1024 && 10#$backend_port <= 65535))
root=${DIDAR_FRONT_ROOT:-/opt/didar/front}
incoming="$root/incoming/$release"
target="$root/releases/$release"
exec 9>"$root/deploy.lock"
flock -n 9 || { echo 'Deployment already running' >&2; exit 1; }
(cd "$incoming" && sha256sum -c front.tar.gz.sha256)
# Frontend-only rollout checks pages; full rollout also requires live API.
if [[ "$api_required" == true ]]; then
  curl --fail --silent --show-error --max-time 10 "$backend/api/categories/" >/dev/null
fi
[[ ! -e "$target" ]]
mkdir "$target"
tar --no-same-owner --no-same-permissions -xzf "$incoming/front.tar.gz" -C "$target"
[[ -f "$target/server.js" && -d "$target/public" && -d "$target/.next/static" ]]
previous=$(readlink -f "$root/current" || true)
if [[ -n "$previous" && -e "$root/current" ]]; then
  [[ "$previous" == "$root/releases/"* && -f "$previous/server.js" ]]
else
  previous=''
fi
activate() {
  local directory=$1
  ln -sfn "$directory" "$root/current.next" || return 1
  mv -Tf "$root/current.next" "$root/current" || return 1
  node - "$directory" "$port" "$root/ecosystem.config.json" <<'JS'
const fs = require('node:fs');
const [cwd, port, file] = process.argv.slice(2);
fs.writeFileSync(file, JSON.stringify({ apps: [{
  name: 'didar-front', cwd, script: `${cwd}/server.js`,
  env: { NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: port },
  autorestart: true,
}] }));
JS
  [[ $? == 0 ]] || return 1
  # PM2 reload keeps the old absolute script path across versioned releases.
  # Recreate this app only; failed activation still restores the previous release.
  pm2 delete didar-front >/dev/null 2>&1 || true
  pm2 start "$root/ecosystem.config.json" --update-env
}
healthy() {
  for attempt in {1..15}; do
    if curl --fail --silent --show-error --max-time 5 "http://127.0.0.1:$port/" >/dev/null &&
       { [[ "$api_required" == false ]] || curl --fail --silent --show-error --max-time 5 "$backend/api/items/" >/dev/null; }; then
      return 0
    fi
    sleep 2
  done
  return 1
}
if activate "$target" && healthy; then
  pm2 save
  rm -rf -- "$incoming"
  echo "Deployed $release"
else
  echo 'Activation failed; rolling back' >&2
  if [[ -n "$previous" ]]; then
    activate "$previous" && healthy && pm2 save || { echo 'ROLLBACK FAILED; manual recovery required' >&2; exit 1; }
  else
    pm2 delete didar-front || true
    rm -f "$root/current"
    pm2 save --force
  fi
  exit 1
fi
