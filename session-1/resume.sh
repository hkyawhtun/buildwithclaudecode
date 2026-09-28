#!/usr/bin/env bash
# resume.sh — jump to a checkpoint in ./personal-os and print its prompt.
#
#   ./resume.sh 03        # checkout tag step-03-* in personal-os, show its prompt
#   ./resume.sh list      # list the checkpoint tags
#
# If a live build fails or runs long, this lands you on the exact known-good state
# so the lecture never derails.
set -euo pipefail
cd "$(dirname "$0")"
REPO="personal-os"
PROMPTS="PROMPTS.md"

if [[ "${1:-}" == "list" || -z "${1:-}" ]]; then
  echo "Checkpoint tags:"
  git -C "$REPO" tag -l 'step-*' | sort
  exit 0
fi

NN=$(printf "%02d" "$((10#$1))")
TAG=$(git -C "$REPO" tag -l "step-${NN}-*" | head -n1)
if [[ -z "$TAG" ]]; then
  echo "No tag matching step-${NN}-*. Available:"
  git -C "$REPO" tag -l 'step-*' | sort
  exit 1
fi

echo "→ checking out $TAG in $REPO/"
git -C "$REPO" checkout "$TAG"

echo
echo "=== prompt for $TAG ==="
awk -v h="## $TAG" '
  $0==h {p=1; next}
  p && /^## / {exit}
  p {print}
' "$PROMPTS"
