#!/usr/bin/env bash
set -euo pipefail

PACKAGE='com.charifmahmoudi.invite'
OUT="${GITHUB_WORKSPACE}/play-screenshots"
mkdir -p "$OUT"

adb install -r "$APK_PATH"
adb shell pm clear "$PACKAGE" >/dev/null
adb shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1 >/dev/null

dump_ui() {
  adb shell uiautomator dump /sdcard/window.xml >/dev/null 2>&1 || true
  adb pull /sdcard/window.xml /tmp/window.xml >/dev/null 2>&1 || true
}

wait_for_text() {
  local needle="$1"
  local tries="${2:-60}"
  for ((i=1; i<=tries; i++)); do
    dump_ui
    if [[ -f /tmp/window.xml ]] && grep -Fq "$needle" /tmp/window.xml; then
      return 0
    fi
    sleep 1
  done
  echo "::error title=Android UI timeout::Could not find text: $needle"
  [[ -f /tmp/window.xml ]] && cat /tmp/window.xml || true
  return 1
}

tap_visible_text() {
  local needle="$1"
  for attempt in 1 2 3 4 5 6; do
    dump_ui
    BOUNDS="$(python3 - "$needle" <<'PY'
import re
import sys
import xml.etree.ElementTree as ET

needle = sys.argv[1]
try:
    root = ET.parse('/tmp/window.xml').getroot()
except Exception:
    raise SystemExit(0)

for node in root.iter('node'):
    text = node.attrib.get('text', '')
    desc = node.attrib.get('content-desc', '')
    if needle in text or needle in desc:
        match = re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', node.attrib.get('bounds', ''))
        if match:
            x1, y1, x2, y2 = map(int, match.groups())
            print(f'{(x1 + x2) // 2} {(y1 + y2) // 2}')
            raise SystemExit
PY
)"
    if [[ -n "$BOUNDS" ]]; then
      read -r X Y <<<"$BOUNDS"
      adb shell input tap "$X" "$Y"
      return 0
    fi
    adb shell input swipe 540 1850 540 650 450
    sleep 1
  done
  echo "::error title=Android UI navigation::Could not tap text: $needle"
  return 1
}

wait_for_text 'Making friends can start with one simple invite.' 60
sleep 2
adb exec-out screencap -p > "$OUT/01-welcome.png"

tap_visible_text 'Explore the demo'
wait_for_text 'What sounds good?' 60
sleep 3
adb exec-out screencap -p > "$OUT/02-discover.png"

python3 - "$OUT/01-welcome.png" "$OUT/02-discover.png" <<'PY'
import os
import struct
import sys

for path in sys.argv[1:]:
    with open(path, 'rb') as handle:
        signature = handle.read(24)
    if signature[:8] != b'\x89PNG\r\n\x1a\n':
        raise SystemExit(f'Not a PNG: {path}')
    width, height = struct.unpack('>II', signature[16:24])
    size = os.path.getsize(path)
    if not (320 <= width <= 3840 and 320 <= height <= 3840):
        raise SystemExit(f'Unexpected screenshot dimensions {width}x{height}: {path}')
    if size < 50000:
        raise SystemExit(f'Screenshot looks suspiciously small ({size} bytes): {path}')
    print(f'{os.path.basename(path)}: {width}x{height}, {size} bytes')
PY
