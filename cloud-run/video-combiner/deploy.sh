#!/usr/bin/env bash
# Deploy the video-combiner service to Cloud Run.
# Run from repo root or from cloud-run/video-combiner/.
#
# Required env vars (set once in your shell or .env):
#   GCP_PROJECT   — your Google Cloud project ID
#   GCP_REGION    — e.g. us-central1  (defaults below)
#
# After first deploy, copy the printed SERVICE_URL into Vercel:
#   CLOUD_RUN_COMBINE_URL=<SERVICE_URL>
#   CLOUD_RUN_SECRET=<any random string>
#   FIREBASE_SERVICE_ACCOUNT_JSON=<your service account JSON, minified>
#   FIREBASE_STORAGE_BUCKET=<your bucket name>

set -euo pipefail

PROJECT="${GCP_PROJECT:?Set GCP_PROJECT}"
REGION="${GCP_REGION:-us-central1}"
SERVICE="banos-video-combiner"
IMAGE="gcr.io/${PROJECT}/${SERVICE}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "▶ Building image ${IMAGE}"
gcloud builds submit "${SCRIPT_DIR}" \
  --tag "${IMAGE}" \
  --project "${PROJECT}"

echo "▶ Deploying to Cloud Run (${REGION})"
gcloud run deploy "${SERVICE}" \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --platform managed \
  --memory 2Gi \
  --cpu 2 \
  --timeout 540 \
  --concurrency 4 \
  --min-instances 0 \
  --max-instances 4 \
  --no-allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --project "${PROJECT}"

SERVICE_URL="$(gcloud run services describe "${SERVICE}" \
  --region "${REGION}" \
  --project "${PROJECT}" \
  --format 'value(status.url)')"

echo ""
echo "✅ Deployed: ${SERVICE_URL}"
echo ""
echo "Add these to Vercel env vars:"
echo "  CLOUD_RUN_COMBINE_URL=${SERVICE_URL}"
echo "  CLOUD_RUN_SECRET=<generate a random secret>"
echo "  FIREBASE_SERVICE_ACCOUNT_JSON=<your service account JSON>"
echo "  FIREBASE_STORAGE_BUCKET=<your bucket name>"
