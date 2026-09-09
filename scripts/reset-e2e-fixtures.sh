#!/usr/bin/env bash
set -euo pipefail

: "${EXPO_PUBLIC_API_URL:?Set EXPO_PUBLIC_API_URL to the isolated E2E API.}"
: "${E2E_FIXTURES_TOKEN:?Set E2E_FIXTURES_TOKEN from the protected CI secret.}"

if [[ "$EXPO_PUBLIC_API_URL" == "https://invite-someone-api.onrender.com" ]]; then
  echo "Refusing to reset the production Invite API." >&2
  exit 1
fi

api_url="${EXPO_PUBLIC_API_URL%/}"
authorization="Authorization: Bearer ${E2E_FIXTURES_TOKEN}"

curl --fail-with-body --silent --show-error \
  --retry 6 \
  --retry-all-errors \
  --retry-delay 5 \
  --max-time 90 \
  --header "$authorization" \
  "${api_url}/v1/e2e/ready" >/dev/null

response_file="$(mktemp)"
trap 'rm -f "$response_file"' EXIT
curl --fail-with-body --silent --show-error \
  --max-time 90 \
  --request POST \
  --header "$authorization" \
  --header 'Content-Type: application/json' \
  --data '{"firebaseIdentities":[]}' \
  "${api_url}/v1/e2e/reset" >"$response_file"

jq -e '.counts.members > 0 and .counts.activities > 0 and .resetAt' "$response_file" >/dev/null
jq '{resetAt, counts}' "$response_file"
