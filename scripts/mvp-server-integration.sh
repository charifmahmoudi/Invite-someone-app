#!/usr/bin/env bash
set -euo pipefail

API_URL="${MVP_API_URL:-http://127.0.0.1:4000}"
LOG_FILE="${MVP_SERVER_LOG:-/tmp/invite-mvp-server.log}"
SERVER_PID=''

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

npm run server:start >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

for attempt in $(seq 1 40); do
  if curl --silent --show-error --fail "$API_URL/health" | grep -Fq '"status":"ok"'; then
    break
  fi
  if [ "$attempt" -eq 40 ]; then
    echo 'Invite API did not become healthy.' >&2
    cat "$LOG_FILE" >&2 || true
    exit 1
  fi
  sleep 1
done

status_request() {
  local method="$1"
  local path="$2"
  local token="$3"
  local body="${4:-}"
  local output="$5"
  local args=(
    --silent --show-error
    --output "$output"
    --write-out '%{http_code}'
    --request "$method"
    --header "Authorization: Bearer $token"
    --header 'Content-Type: application/json'
  )
  if [ -n "$body" ]; then
    args+=(--data "$body")
  fi
  curl "${args[@]}" "$API_URL$path"
}

register_user() {
  local prefix="$1"
  local name="$2"
  local email="invite-${prefix}-${GITHUB_RUN_ID:-local}-${RANDOM}@example.com"
  local payload
  payload="$(jq -nc \
    --arg name "$name" \
    --arg email "$email" \
    '{name:$name,email:$email,password:"Invite-CI-Aa9!secure",city:"Berlin",interests:["Coffee","Outdoors"],availability:["Saturday"],connectionGoals:["New friends"]}')"
  curl --silent --show-error --fail \
    --request POST \
    --header 'Content-Type: application/json' \
    --data "$payload" \
    "$API_URL/v1/auth/register"
}

HOST_JSON="$(register_user host 'CI Host')"
GUEST_JSON="$(register_user guest 'CI Guest')"
OTHER_JSON="$(register_user other 'CI Other')"
HOST_ID="$(jq -er '.userId' <<<"$HOST_JSON")"
GUEST_ID="$(jq -er '.userId' <<<"$GUEST_JSON")"
OTHER_ID="$(jq -er '.userId' <<<"$OTHER_JSON")"
HOST_TOKEN="$(jq -er '.token' <<<"$HOST_JSON")"
GUEST_TOKEN="$(jq -er '.token' <<<"$GUEST_JSON")"
OTHER_TOKEN="$(jq -er '.token' <<<"$OTHER_JSON")"
export HOST_ID GUEST_ID OTHER_ID

future_iso() {
  node -e "console.log(new Date(Date.now() + $1 * 60 * 60 * 1000).toISOString())"
}

START_ONE="$(future_iso 48)"
START_TWO="$(future_iso 72)"

activity_payload() {
  local title="$1"
  local start="$2"
  local capacity="$3"
  jq -nc \
    --arg title "$title" \
    --arg start "$start" \
    --argjson capacity "$capacity" \
    '{title:$title,description:"A CI integration plan with enough detail to satisfy validation and exercise lifecycle rules.",category:"Coffee",startAt:$start,location:"CI Cafe, Alexanderplatz",city:"Berlin",capacity:$capacity,visibility:"community",vibe:"Easygoing"}'
}

CREATE_ONE="$(activity_payload 'CI lifecycle plan' "$START_ONE" 5)"
ACTIVITY_ONE_JSON="$(curl --silent --show-error --fail \
  --request POST \
  --header "Authorization: Bearer $HOST_TOKEN" \
  --header 'Content-Type: application/json' \
  --data "$CREATE_ONE" \
  "$API_URL/v1/activities")"
ACTIVITY_ONE_ID="$(jq -er '.id' <<<"$ACTIVITY_ONE_JSON")"

# Unauthorized edit must fail.
EDIT_ONE="$(activity_payload 'CI lifecycle plan edited' "$START_ONE" 5)"
STATUS="$(status_request PATCH "/v1/activities/$ACTIVITY_ONE_ID" "$OTHER_TOKEN" "$EDIT_ONE" /tmp/mvp-edit-other.json)"
test "$STATUS" = '403'

# Host edit succeeds.
STATUS="$(status_request PATCH "/v1/activities/$ACTIVITY_ONE_ID" "$HOST_TOKEN" "$EDIT_ONE" /tmp/mvp-edit-host.json)"
test "$STATUS" = '200'
jq -e '.title == "CI lifecycle plan edited"' /tmp/mvp-edit-host.json >/dev/null

# Host cannot leave their own plan.
STATUS="$(status_request DELETE "/v1/activities/$ACTIVITY_ONE_ID/attendees/me" "$HOST_TOKEN" '' /tmp/mvp-host-leave.json)"
test "$STATUS" = '409'

# Two other people join; capacity cannot then be reduced below current attendance.
STATUS="$(status_request PUT "/v1/activities/$ACTIVITY_ONE_ID/attendees/me" "$GUEST_TOKEN" '' /tmp/mvp-guest-join.json)"
test "$STATUS" = '204'
STATUS="$(status_request PUT "/v1/activities/$ACTIVITY_ONE_ID/attendees/me" "$OTHER_TOKEN" '' /tmp/mvp-other-join.json)"
test "$STATUS" = '204'
EDIT_TOO_SMALL="$(activity_payload 'CI lifecycle plan edited' "$START_ONE" 2)"
STATUS="$(status_request PATCH "/v1/activities/$ACTIVITY_ONE_ID" "$HOST_TOKEN" "$EDIT_TOO_SMALL" /tmp/mvp-capacity.json)"
test "$STATUS" = '409'

# An attendee can leave and is removed from the activity state.
STATUS="$(status_request DELETE "/v1/activities/$ACTIVITY_ONE_ID/attendees/me" "$GUEST_TOKEN" '' /tmp/mvp-guest-leave.json)"
test "$STATUS" = '204'
GUEST_DATA="$(curl --silent --show-error --fail --header "Authorization: Bearer $GUEST_TOKEN" "$API_URL/v1/data")"
jq -e --arg id "$ACTIVITY_ONE_ID" --arg guest "$GUEST_ID" '(.activities[] | select(.id == $id) | .attendeeIds | index($guest)) == null' <<<"$GUEST_DATA" >/dev/null

# Non-host cancellation fails; host cancellation succeeds and disables future mutation.
STATUS="$(status_request DELETE "/v1/activities/$ACTIVITY_ONE_ID" "$OTHER_TOKEN" '' /tmp/mvp-cancel-other.json)"
test "$STATUS" = '403'
STATUS="$(status_request DELETE "/v1/activities/$ACTIVITY_ONE_ID" "$HOST_TOKEN" '' /tmp/mvp-cancel-host.json)"
test "$STATUS" = '204'
STATUS="$(status_request PUT "/v1/activities/$ACTIVITY_ONE_ID/attendees/me" "$GUEST_TOKEN" '' /tmp/mvp-cancelled-join.json)"
test "$STATUS" = '409'

CANCELLED_INVITE="$(jq -nc --arg activity "$ACTIVITY_ONE_ID" --arg receiver "$GUEST_ID" '{invitations:[{activityId:$activity,receiverId:$receiver,message:"Join the cancelled plan"}]}')"
STATUS="$(status_request POST '/v1/invitations' "$HOST_TOKEN" "$CANCELLED_INVITE" /tmp/mvp-cancelled-invite.json)"
test "$STATUS" = '409'

# Create an active plan for invitation/block behavior.
CREATE_TWO="$(activity_payload 'CI block plan' "$START_TWO" 5)"
ACTIVITY_TWO_JSON="$(curl --silent --show-error --fail \
  --request POST \
  --header "Authorization: Bearer $HOST_TOKEN" \
  --header 'Content-Type: application/json' \
  --data "$CREATE_TWO" \
  "$API_URL/v1/activities")"
ACTIVITY_TWO_ID="$(jq -er '.id' <<<"$ACTIVITY_TWO_JSON")"
INVITE_TWO="$(jq -nc --arg activity "$ACTIVITY_TWO_ID" --arg receiver "$GUEST_ID" '{invitations:[{activityId:$activity,receiverId:$receiver,message:"Would you like to join?"}]}')"
INVITE_RESPONSE="$(curl --silent --show-error --fail \
  --request POST \
  --header "Authorization: Bearer $HOST_TOKEN" \
  --header 'Content-Type: application/json' \
  --data "$INVITE_TWO" \
  "$API_URL/v1/invitations")"
test "$(jq 'length' <<<"$INVITE_RESPONSE")" = '1'

# Self-block is forbidden.
STATUS="$(status_request PUT "/v1/people/$GUEST_ID/block" "$GUEST_TOKEN" '' /tmp/mvp-self-block.json)"
test "$STATUS" = '400'

# Blocking cancels pending interaction, hides discovery/activity data, and prevents new invitations.
STATUS="$(status_request PUT "/v1/people/$HOST_ID/block" "$GUEST_TOKEN" '' /tmp/mvp-block.json)"
test "$STATUS" = '204'
GUEST_DATA_BLOCKED="$(curl --silent --show-error --fail --header "Authorization: Bearer $GUEST_TOKEN" "$API_URL/v1/data")"
jq -e --arg host "$HOST_ID" '[.profiles[].id] | index($host) == null' <<<"$GUEST_DATA_BLOCKED" >/dev/null
jq -e --arg activity "$ACTIVITY_TWO_ID" '[.activities[].id] | index($activity) == null' <<<"$GUEST_DATA_BLOCKED" >/dev/null
STATUS="$(status_request POST '/v1/invitations' "$HOST_TOKEN" "$INVITE_TWO" /tmp/mvp-blocked-invite.json)"
test "$STATUS" = '403'

BLOCKS="$(curl --silent --show-error --fail --header "Authorization: Bearer $GUEST_TOKEN" "$API_URL/v1/blocks")"
jq -e --arg host "$HOST_ID" '[.[].id] | index($host) != null' <<<"$BLOCKS" >/dev/null

# Unblocking restores discovery but does not resurrect old pending invitations.
STATUS="$(status_request DELETE "/v1/people/$HOST_ID/block" "$GUEST_TOKEN" '' /tmp/mvp-unblock.json)"
test "$STATUS" = '204'
GUEST_DATA_UNBLOCKED="$(curl --silent --show-error --fail --header "Authorization: Bearer $GUEST_TOKEN" "$API_URL/v1/data")"
jq -e --arg host "$HOST_ID" '[.profiles[].id] | index($host) != null' <<<"$GUEST_DATA_UNBLOCKED" >/dev/null

# Reports are accepted and reporter identity comes from the authenticated server session,
# ignoring any attempted reporterId supplied by the client.
PROFILE_REPORT="$(jq -nc --arg target "$HOST_ID" --arg forged "$OTHER_ID" '{targetType:"profile",targetId:$target,reason:"Harassment or threatening behavior",details:"CI safety report",reporterId:$forged}')"
REPORT_JSON="$(curl --silent --show-error --fail \
  --request POST \
  --header "Authorization: Bearer $GUEST_TOKEN" \
  --header 'Content-Type: application/json' \
  --data "$PROFILE_REPORT" \
  "$API_URL/v1/reports")"
REPORT_ID="$(jq -er '.id' <<<"$REPORT_JSON")"
jq -e '.status == "open"' <<<"$REPORT_JSON" >/dev/null

ACTIVITY_REPORT="$(jq -nc --arg target "$ACTIVITY_TWO_ID" '{targetType:"activity",targetId:$target,reason:"Unsafe activity",details:"CI activity report"}')"
ACTIVITY_REPORT_JSON="$(curl --silent --show-error --fail \
  --request POST \
  --header "Authorization: Bearer $GUEST_TOKEN" \
  --header 'Content-Type: application/json' \
  --data "$ACTIVITY_REPORT" \
  "$API_URL/v1/reports")"
jq -e '.status == "open"' <<<"$ACTIVITY_REPORT_JSON" >/dev/null

REPORT_ID="$REPORT_ID" MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017}" MONGODB_DB_NAME="${MONGODB_DB_NAME:-invite_mvp_ci}" node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { MongoClient } from 'mongodb';
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
try {
  const report = await client.db(process.env.MONGODB_DB_NAME).collection('safety_reports').findOne({ _id: process.env.REPORT_ID });
  assert.ok(report, 'report should exist');
  assert.equal(report.reporterId, process.env.GUEST_ID, 'reporter must be derived from authenticated session');
  assert.notEqual(report.reporterId, process.env.OTHER_ID, 'forged reporterId must be ignored');
} finally {
  await client.close();
}
NODE

echo 'MVP server integration suite passed.'
