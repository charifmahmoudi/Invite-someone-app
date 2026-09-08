#!/usr/bin/env bash
set -euo pipefail

APK_PATH="${APK_PATH:-android/app/build/outputs/apk/release/app-release.apk}"
E2E_EMAIL="${E2E_EMAIL:-invite-ci-invalid-${GITHUB_RUN_ID:-local}@example.com}"
E2E_PASSWORD="${E2E_PASSWORD:-Definitely-Wrong-Password-123!}"
MAESTRO="${HOME}/.maestro/bin/maestro"
PACKAGE="com.charifmahmoudi.invite"

if [[ ! -f "$APK_PATH" ]]; then
  echo "::error title=Missing Android smoke APK::Could not find $APK_PATH"
  exit 1
fi
if [[ ! -x "$MAESTRO" ]]; then
  echo '::error title=Missing Maestro::Maestro is not installed.'
  exit 1
fi

adb install -r "$APK_PATH"

"$MAESTRO" test \
  -e E2E_EMAIL="$E2E_EMAIL" \
  -e E2E_PASSWORD="$E2E_PASSWORD" \
  .maestro/auth/firebase-invalid-sign-in.yaml

run_clean_demo_journey() {
  local flow="$1"
  adb shell pm clear "$PACKAGE" >/dev/null
  "$MAESTRO" test "$flow"
}

# Each demo journey starts from clean application storage. They exercise the same
# reducer/UI paths as the product without mutating the hosted Firebase/Mongo staging environment.
run_clean_demo_journey .maestro/core/demo-navigation.yaml
run_clean_demo_journey .maestro/core/mvp-plan-lifecycle.yaml
run_clean_demo_journey .maestro/core/mvp-safety-lifecycle.yaml
