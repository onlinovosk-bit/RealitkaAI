#!/usr/bin/env bash
set -u

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== REVOLIS.AI VERCEL 404 DIAGNOSTICS ===${NC}"
echo "Started: $(date)"
echo "Project dir: $(pwd)"

run_check() {
  local title="$1"
  shift
  echo -e "\n${YELLOW}${title}${NC}"
  if "$@"; then
    echo -e "${GREEN}✓ OK${NC}"
    return 0
  else
    echo -e "${RED}✗ FAILED${NC}"
    return 1
  fi
}

echo -e "\n${YELLOW}[1] TypeScript errors (npx tsc --noEmit)${NC}"
if npx tsc --noEmit >/tmp/revolis-tsc.out 2>&1; then
  echo -e "${GREEN}✓ No TS errors${NC}"
else
  echo -e "${RED}✗ TS errors found${NC}"
  sed -n '1,40p' /tmp/revolis-tsc.out
fi

echo -e "\n${YELLOW}[2] Next.js build test (npm run build)${NC}"
if npm run build >/tmp/revolis-build.out 2>&1; then
  echo -e "${GREEN}✓ Build OK${NC}"
  tail -n 20 /tmp/revolis-build.out
else
  echo -e "${RED}✗ Build FAILED${NC}"
  tail -n 40 /tmp/revolis-build.out
fi

run_check "[3] next.config.js validity" node -e "require('./next.config.js'); console.log('next.config.js loaded')"

echo -e "\n${YELLOW}[4] vercel.json validity${NC}"
if [ -f "vercel.json" ]; then
  if node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('vercel.json loaded')"; then
    echo -e "${GREEN}✓ vercel.json OK${NC}"
  else
    echo -e "${RED}✗ vercel.json invalid JSON${NC}"
  fi
else
  echo -e "${YELLOW}⚠ no vercel.json${NC}"
fi

echo -e "\n${YELLOW}[5] Critical App Router pages exist (Revolis layout)${NC}"
for page in \
  "src/app/page.tsx" \
  "src/app/layout.tsx" \
  "src/app/(dashboard)/team/permissions/page.tsx" \
  "src/app/dashboard/reputation/integrity/page.tsx"
do
  if [ -f "$page" ]; then
    echo -e "${GREEN}✓ ${page}${NC}"
  else
    echo -e "${RED}✗ MISSING: ${page}${NC}"
  fi
done

echo -e "\n${YELLOW}[6] Routing hardening files exist${NC}"
for file in "next.config.js" "src/proxy.ts"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓ ${file}${NC}"
  else
    echo -e "${RED}✗ MISSING: ${file}${NC}"
  fi
done

echo -e "\n${YELLOW}[7] Required env vars on Vercel (production)${NC}"
if command -v vercel >/dev/null 2>&1; then
  if vercel env ls production >/tmp/revolis-vercel-env.out 2>&1; then
    for var in \
      NEXT_PUBLIC_SUPABASE_URL \
      NEXT_PUBLIC_SUPABASE_ANON_KEY \
      SUPABASE_SERVICE_ROLE_KEY \
      OPENAI_API_KEY
    do
      if node -e "const fs=require('fs'); const txt=fs.readFileSync('/tmp/revolis-vercel-env.out','utf8'); process.exit(txt.includes('${var}')?0:1)"; then
        echo -e "${GREEN}✓ ${var}${NC}"
      else
        echo -e "${RED}✗ MISSING on Vercel: ${var}${NC}"
      fi
    done
  else
    echo -e "${YELLOW}⚠ Could not read Vercel envs (check login/project link).${NC}"
    sed -n '1,20p' /tmp/revolis-vercel-env.out
  fi
else
  echo -e "${YELLOW}⚠ vercel CLI not installed in PATH${NC}"
fi

echo -e "\n${YELLOW}[8] Last 5 git commits${NC}"
git log --oneline -5

echo -e "\n${YELLOW}[9] Quick production smoke checks${NC}"
for url in \
  "https://app.revolis.ai/" \
  "https://app.revolis.ai/dashboard" \
  "https://app.revolis.ai/team" \
  "https://app.revolis.ai/team/permissions" \
  "https://app.revolis.ai/api/leads"
do
  code="$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)"
  printf "%-55s %s\n" "$url" "$code"
done

echo -e "\n${YELLOW}[10] Vercel production checklist${NC}"
echo "Vercel → Settings → Build and Deployment:"
echo "  - Root Directory: apps/crm"
echo "  - Build Command: npm run build"
echo "  - Install Command: npm install"
echo "  - Output Directory: default (empty)"
echo "  - Production Overrides: use Project Settings"

echo -e "\n${GREEN}=== DIAGNOSTICS COMPLETE ===${NC}"
