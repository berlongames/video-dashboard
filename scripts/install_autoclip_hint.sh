#!/usr/bin/env bash
set -euo pipefail

echo "=== AutoClip install options ==="
echo ""
echo "1) Official CLI / MCP (recommended for workers):"
echo "   uvx autoclip-mcp"
echo "   # or from source:"
echo "   git clone https://github.com/zhouxiaoka/autoclip.git"
echo "   cd autoclip && python -m venv .venv && source .venv/bin/activate"
echo "   pip install -r requirements.txt && pip install --no-deps ."
echo ""
echo "2) Docker (run AutoClip web + API separately):"
echo "   git clone https://github.com/zhouxiaoka/autoclip.git && cd autoclip"
echo "   cp env.example .env   # set LLM keys"
echo "   docker compose up -d --build"
echo ""
echo "Set AUTOCLIP_CMD in .env of this dashboard to the binary path."
