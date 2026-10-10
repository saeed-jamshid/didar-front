#!/usr/bin/env bash
# Isolated deployment/rollback checks; no SSH, live PM2 or network calls.
set -euo pipefail
script=$(cd "$(dirname "$0")" && pwd)/deploy-front.sh
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
export DIDAR_FRONT_ROOT="$tmp/front"
mkdir -p "$DIDAR_FRONT_ROOT"/{incoming,releases} "$tmp/bin" "$tmp/package"/{public,.next/static}
printf '// test server\n' > "$tmp/package/server.js"
cat > "$tmp/bin/pm2" <<'SH'
#!/bin/bash
printf '%s\n' "$*" >> "$DIDAR_FRONT_ROOT/pm2.log"
if [[ "$1" == delete ]]; then
  rm -f "$DIDAR_FRONT_ROOT/running-release"
elif [[ "$1" == start ]]; then
  node -e 'const fs=require("node:fs"); const app=JSON.parse(fs.readFileSync(process.argv[1])).apps[0]; if(app.script !== `${app.cwd}/server.js`) process.exit(1); fs.writeFileSync(process.argv[2],app.cwd)' "$2" "$DIDAR_FRONT_ROOT/running-release"
fi
# Model PM2 reload retaining its old absolute script path.
SH
cat > "$tmp/bin/curl" <<'SH'
#!/bin/bash
url=${!#}
if [[ "$url" == */api/categories/ ]]; then
  [[ ${FAIL_BACKEND:-0} == 0 ]]
else
  [[ -f "$DIDAR_FRONT_ROOT/running-release" ]] || exit 1
  [[ $(< "$DIDAR_FRONT_ROOT/running-release") == "$(readlink -f "$DIDAR_FRONT_ROOT/current")" ]] || exit 1
  [[ $(basename "$(readlink -f "$DIDAR_FRONT_ROOT/current")") != "${FAIL_RELEASE:-none}" ]]
fi
SH
printf '#!/bin/bash\nexit 0\n' > "$tmp/bin/sleep"
chmod +x "$tmp/bin/"*
export PATH="$tmp/bin:$PATH"
prepare() {
  mkdir "$DIDAR_FRONT_ROOT/incoming/$1"
  tar -czf "$DIDAR_FRONT_ROOT/incoming/$1/front.tar.gz" -C "$tmp/package" .
  (cd "$DIDAR_FRONT_ROOT/incoming/$1" && sha256sum front.tar.gz > front.tar.gz.sha256)
}
first=$(printf 'a%.0s' {1..40})-1-1
second=$(printf 'b%.0s' {1..40})-2-1
third=$(printf 'c%.0s' {1..40})-3-1
prepare "$first"
bash "$script" "$first" 3006 http://127.0.0.1:8092
[[ $(readlink -f "$DIDAR_FRONT_ROOT/current") == "$DIDAR_FRONT_ROOT/releases/$first" ]]
[[ ! -d "$DIDAR_FRONT_ROOT/incoming/$first" ]]
prepare "$second"
if FAIL_RELEASE="$second" bash "$script" "$second" 3006 http://127.0.0.1:8092; then
  echo 'Failed health check incorrectly succeeded' >&2; exit 1
fi
[[ $(readlink -f "$DIDAR_FRONT_ROOT/current") == "$DIDAR_FRONT_ROOT/releases/$first" ]]
prepare "$third"
if FAIL_BACKEND=1 bash "$script" "$third" 3006 http://127.0.0.1:8092; then
  echo 'Unavailable backend incorrectly accepted' >&2; exit 1
fi
[[ ! -d "$DIDAR_FRONT_ROOT/releases/$third" ]]
[[ $(readlink -f "$DIDAR_FRONT_ROOT/current") == "$DIDAR_FRONT_ROOT/releases/$first" ]]
if bash "$script" '../invalid' 3006 http://127.0.0.1:8092; then
  echo 'Invalid release accepted' >&2; exit 1
fi
fourth=$(printf 'd%.0s' {1..40})-4-1
prepare "$fourth"
FAIL_BACKEND=1 bash "$script" "$fourth" 3006 http://127.0.0.1:8092 false
[[ $(readlink -f "$DIDAR_FRONT_ROOT/current") == "$DIDAR_FRONT_ROOT/releases/$fourth" ]]
[[ $(< "$DIDAR_FRONT_ROOT/running-release") == "$DIDAR_FRONT_ROOT/releases/$fourth" ]]
if bash "$script" "$fourth" 3006 http://127.0.0.1:8092 invalid; then
  echo 'Invalid API policy accepted' >&2; exit 1
fi
fifth=$(printf 'e%.0s' {1..40})-5-1
prepare "$fifth"
printf corrupt >> "$DIDAR_FRONT_ROOT/incoming/$fifth/front.tar.gz"
if bash "$script" "$fifth" 3006 http://127.0.0.1:8092; then
  echo 'Corrupt archive accepted' >&2; exit 1
fi
[[ ! -d "$DIDAR_FRONT_ROOT/releases/$fifth" ]]
[[ $(readlink -f "$DIDAR_FRONT_ROOT/current") == "$DIDAR_FRONT_ROOT/releases/$fourth" ]]
echo 'Deployment, rollback, backend gate, frontend-only, checksum and input checks passed'
