#!/usr/bin/env bash
set +e

failed=0
while IFS= read -r flow; do
  echo "Running Maestro flow: $flow"
  "$HOME/.maestro/bin/maestro" test \
    -e E2E_EMAIL="$E2E_EMAIL" \
    -e E2E_PASSWORD="$E2E_PASSWORD" \
    "$flow"
  if [ "$?" -ne 0 ]; then
    failed=1
  fi
done < <(find .maestro -type f -name '*.yaml' | sort)

exit "$failed"
