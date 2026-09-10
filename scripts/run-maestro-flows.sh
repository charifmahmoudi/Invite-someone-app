#!/usr/bin/env bash
# Run flows one at a time so clearState and the deterministic account cannot
# interfere across tests. Keep diagnostics in the log for CI triage.
set +e

failed=0
mapfile -t flows < <(find .maestro -type f -name '*.yaml' | sort)
echo "Discovered ${#flows[@]} Maestro flows."
if [ "${#flows[@]}" -ne 14 ]; then
  echo "Expected 14 Maestro flows; refusing incomplete E2E execution."
  printf '%s\n' "${flows[@]}"
  exit 1
fi

for flow in "${flows[@]}"; do
  echo "Running Maestro flow: $flow"
  # Software-rendered hosted emulators can leave the Pixel launcher in an ANR
  # dialog over the app. Dismiss it before Maestro starts so it can interact
  # with the already-installed APK. This is CI hygiene, not app behavior.
  adb shell input keyevent 4 >/dev/null 2>&1 || true
  adb shell am force-stop com.google.android.apps.nexuslauncher >/dev/null 2>&1 || true
  "$HOME/.maestro/bin/maestro" test \
    -e E2E_EMAIL="$E2E_EMAIL" \
    -e E2E_PASSWORD="$E2E_PASSWORD" \
    "$flow"
  if [ "$?" -ne 0 ]; then
    failed=1
  fi
done

exit "$failed"
