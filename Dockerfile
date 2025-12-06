# Stage 1: install dependencies and build
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
# Default values to allow non-interactive Docker builds; override via environment
# variables or a mounted .env file for real deployments.
ENV NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
ENV SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
ENV DIRECT_URL=postgresql://postgres:postgres@localhost:54322/postgres
ENV ZARINPAL_MERCHANT_ID=DEMO-MERCHANT
ENV ZARINPAL_CALLBACK_URL=http://localhost:3070/payments-api/zarinpal-callback
ENV ZARINPAL_AMOUNT=10000
ENV ZARINPAL_SANDBOX=true
ENV ZARINPAL_SUCCESS_REDIRECT=http://localhost:3070/dashboard
ENV ZARINPAL_FAILURE_REDIRECT=http://localhost:3070/billing?status=failed
ENV ZARINPAL_SUBSCRIPTION_DAYS=30
ENV ZARINPAL_PAYMENT_PORTAL_URL=https://www.zarinpal.com/pg/services/payment
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Stage 2: production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3070
ENV NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
ENV SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
ENV DIRECT_URL=postgresql://postgres:postgres@localhost:54322/postgres
ENV ZARINPAL_MERCHANT_ID=DEMO-MERCHANT
ENV ZARINPAL_CALLBACK_URL=http://localhost:3070/payments-api/zarinpal-callback
ENV ZARINPAL_AMOUNT=10000
ENV ZARINPAL_SANDBOX=true
ENV ZARINPAL_SUCCESS_REDIRECT=http://localhost:3070/dashboard
ENV ZARINPAL_FAILURE_REDIRECT=http://localhost:3070/billing?status=failed
ENV ZARINPAL_SUBSCRIPTION_DAYS=30
ENV ZARINPAL_PAYMENT_PORTAL_URL=https://www.zarinpal.com/pg/services/payment
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

EXPOSE 3070
CMD ["node", "server.js"]
