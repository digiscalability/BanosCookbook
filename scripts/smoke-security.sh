#!/usr/bin/env bash
# Security smoke test: every sensitive route must refuse an anonymous caller.
#
#   scripts/smoke-security.sh https://<preview>.vercel.app
#   VERCEL_BYPASS=<protection-bypass-secret> scripts/smoke-security.sh https://<preview>.vercel.app
#   VERCEL_SHARE_URL=<_vercel_share link> scripts/smoke-security.sh https://<preview>.vercel.app
#
# The bypass secret or share link only gets past Vercel Authentication on previews;
# every request still reaches the app with no app session (anonymous).
#
# Prints a Markdown table (paste into the PR) and exits 1 if any row fails.
# Pass = the status is in the expected set; admin pages may also pass by
# redirecting (307/308) to /sign-in.

set -u
BASE="${1:?usage: smoke-security.sh <base-url>}"
BASE="${BASE%/}"

HDRS=(-H "User-Agent: banos-smoke-security/1")
if [ -n "${VERCEL_BYPASS:-}" ]; then
  HDRS+=(-H "x-vercel-protection-bypass: ${VERCEL_BYPASS}" -H "x-vercel-set-bypass-cookie: false")
fi
if [ -n "${VERCEL_SHARE_URL:-}" ]; then
  JAR="$(mktemp)"
  trap 'rm -f "$JAR"' EXIT
  curl -s -o /dev/null -c "$JAR" -L "$VERCEL_SHARE_URL"
  # Keep only Vercel's own auth cookie so the app sees an anonymous visitor.
  VJWT=$(awk '$6 == "_vercel_jwt" {print $7}' "$JAR" | tail -1)
  [ -n "$VJWT" ] || { echo "Could not obtain _vercel_jwt from VERCEL_SHARE_URL" >&2; exit 2; }
  HDRS+=(-H "Cookie: _vercel_jwt=${VJWT}")
fi

fails=0
echo "| Method | Path | Expected | Got | Result |"
echo "|---|---|---|---|---|"

# check METHOD PATH EXPECTED [BODY] [EXTRA_HEADER]
check() {
  local method="$1" path="$2" expected="$3" body="${4:-}" extra="${5:-}"
  local args=(-s -o /dev/null -w "%{http_code} %{redirect_url}" -X "$method" "${HDRS[@]}" --max-time 30)
  [ -n "$body" ] && args+=(-H "Content-Type: application/json" --data "$body")
  [ -n "$extra" ] && args+=(-H "$extra")
  local out code loc got result="PASS"
  out=$(curl "${args[@]}" "$BASE$path")
  code="${out%% *}"
  loc="${out#* }"
  got="$code"
  if [[ "$code" =~ ^30[78]$ ]]; then
    got="$code → ${loc#"$BASE"}"
  fi
  if [[ ",$expected," == *",$code,"* ]]; then
    :
  elif [[ "$expected" == *"signin"* && "$code" =~ ^30[78]$ && "$loc" == *"/sign-in"* ]]; then
    :
  else
    result="**FAIL**"
    fails=$((fails + 1))
  fi
  echo "| $method | \`$path\` | ${expected//,/ or } | $got | $result |"
}

# Admin pages (middleware: redirect to sign-in)
check GET  /admin                                   "signin,401,403,404"
check GET  /admin/cleanup                           "signin,401,403,404"
check GET  /admin/generated-images                  "signin,401,403,404"
check GET  /videohub                                "signin,401,403,404"

# Admin APIs
check GET    /api/admin/generated-images            "401"
check DELETE "/api/admin/generated-images?daysOld=0" "401"
check GET    /api/admin/remove-duplicates           "401,405"
check POST   /api/admin/remove-duplicates           "401" '{"dryRun":false}'

# Recipe writes
check POST   /api/recipes                           "401" '{"title":"Smoke test","author":"x","postToInstagram":true}'
check PUT    /api/recipes/smoke-test-id             "401" '{"status":"published"}'
check DELETE /api/recipes/smoke-test-id             "401"

# Uploads and spending endpoints
check POST /api/images/upload                       "401"
check POST /api/drive/upload                        "401"
check POST /api/upload-asset                        "401"
check POST /api/video/combine                       "401" '{"recipeId":"x"}'
check POST /api/comment-reply-suggestion            "401" '{"recipeTitle":"x","comment":"y"}'
check POST /api/recipe-from-url                     "401" '{"url":"https://example.com"}'
check GET  /api/instagram/preflight                 "401"

# Instagram OAuth and webhook
check GET  /api/auth/instagram                      "401"
check GET  "/api/auth/instagram/callback?code=x&state=y" "401"
check POST /api/webhooks/instagram                  "401" '{"object":"instagram","entry":[]}'
check POST /api/webhooks/instagram                  "401" '{"object":"instagram","entry":[]}' "x-hub-signature-256: sha256=0000000000000000000000000000000000000000000000000000000000000000"

# Session endpoint refuses junk tokens
check POST /api/auth/session                        "401" '{"idToken":"not-a-token"}'

# SSRF guard
check POST /api/resolve-image                       "400" '{"url":"https://169.254.169.254/latest/meta-data/"}'
check POST /api/resolve-image                       "400" '{"url":"http://127.0.0.1/"}'
check POST /api/resolve-image                       "400" '{"url":"https://evilpicsum.photos/x"}'

# Removed: cron, email relay, test, debug and TikTok routes
check GET  /api/cron/daily-social                   "404"
check POST /api/notifications/email                 "404" '{"to":"a@b.c","type":"new_like","recipeTitle":"x","recipeUrl":"x","authorName":"x"}'
check GET  /api/test-env                            "404"
check GET  /api/test-bucket                         "404"
check POST /api/test-pdf-text                       "404"
check GET  /api/test-generate-image                 "404"
check GET  /api/debug/instagram/sync/x              "404"
check GET  /api/tiktok/preflight                    "404"
check GET  /test-pdf                                "404"
check GET  /test-real-pdf                           "404"
check GET  /test-image-pdf                          "404"
check GET  /test-fallback-pdf                       "404"
check GET  /process-real-pdf                        "404"

echo
if [ "$fails" -eq 0 ]; then
  echo "All checks passed against $BASE"
else
  echo "$fails check(s) FAILED against $BASE"
  exit 1
fi
