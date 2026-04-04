#!/bin/bash
# Deploy Edge Functions using Supabase CLI
# Requires: SUPABASE_ACCESS_TOKEN env var or `supabase login`

set -e

PROJECT_REF="lwmadssysqcwbsoiaokc"

echo "🚀 Deploying Edge Functions for Sprint 4..."
echo ""

# Deploy refactored coach function (web streaming)
echo "📦 1/4 — Deploying coach (web streaming)..."
supabase functions deploy coach --project-ref $PROJECT_REF
echo "✅ coach deployed"

# Deploy email-inbound (webhook, no JWT)
echo "📦 2/4 — Deploying email-inbound (webhook)..."
supabase functions deploy email-inbound --project-ref $PROJECT_REF --no-verify-jwt
echo "✅ email-inbound deployed"

# Deploy telegram-webhook (webhook, no JWT)
echo "📦 3/4 — Deploying telegram-webhook (webhook)..."
supabase functions deploy telegram-webhook --project-ref $PROJECT_REF --no-verify-jwt
echo "✅ telegram-webhook deployed"

# Deploy telegram-connect (JWT required)
echo "📦 4/4 — Deploying telegram-connect (JWT)..."
supabase functions deploy telegram-connect --project-ref $PROJECT_REF
echo "✅ telegram-connect deployed"

echo ""
echo "🎉 All functions deployed!"
echo ""
echo "⚠️  Don't forget to set secrets:"
echo "  supabase secrets set TELEGRAM_BOT_TOKEN=\$TELEGRAM_BOT_TOKEN --project-ref $PROJECT_REF"
echo "  supabase secrets set TELEGRAM_WEBHOOK_SECRET=\$TELEGRAM_WEBHOOK_SECRET --project-ref $PROJECT_REF"
echo ""
echo "⚠️  Then register the Telegram webhook:"
echo "  curl -X POST 'https://api.telegram.org/bot\$TELEGRAM_BOT_TOKEN/setWebhook' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"url\": \"https://lwmadssysqcwbsoiaokc.supabase.co/functions/v1/telegram-webhook\", \"secret_token\": \"\$TELEGRAM_WEBHOOK_SECRET\", \"allowed_updates\": [\"message\"]}'"

