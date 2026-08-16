#!/bin/sh

# Install and launch a standalone APK, then wait for expected accessible text.
# Kept as a POSIX script because android-emulator-runner invokes commands with sh.
set -eu

apk_path=${1:?"APK path is required"}
package_id=${2:?"Android package ID is required"}
expected_text=${3:?"Expected welcome text is required"}
remote_dump=/sdcard/invite-window.xml
local_dump=startup-window.xml

adb install -r "$apk_path"
adb shell am force-stop "$package_id"
adb shell monkey -p "$package_id" -c android.intent.category.LAUNCHER 1

attempt=1
while [ "$attempt" -le 30 ]; do
  adb shell uiautomator dump "$remote_dump" >/dev/null 2>&1 || true
  adb pull "$remote_dump" "$local_dump" >/dev/null 2>&1 || true
  if [ -f "$local_dump" ] && grep -Fq "$expected_text" "$local_dump"; then
    echo "Invite reached the welcome screen."
    exit 0
  fi
  attempt=$((attempt + 1))
  sleep 2
done

echo "Invite did not leave the splash screen within 60 seconds."
adb logcat -d '*:E' > startup-logcat.txt || true
tail -200 startup-logcat.txt || true
exit 1
