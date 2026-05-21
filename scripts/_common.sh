# Shared setup for CentOS 7 / glibc 2.17 hosts: force Node 16 via nvm.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

setup_node() {
  if [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
    # shellcheck disable=SC1091
    source "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
    nvm use 16 >/dev/null
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "error: node not found. Install Node 16 with nvm on this host." >&2
    exit 1
  fi

  local major
  major="$(node -p 'process.versions.node.split(".")[0]')"
  if [[ "$major" != "16" ]]; then
    echo "error: Node 16 is required on glibc 2.17 (CentOS 7). Current: $(node -v)" >&2
    echo "hint: source ~/.nvm/nvm.sh && nvm use 16" >&2
    exit 1
  fi
}
