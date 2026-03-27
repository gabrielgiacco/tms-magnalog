#!/usr/bin/env bash
# =============================================================================
# MagnaLog TMS — Script de configuração inicial
# =============================================================================
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       MAGNALOG TMS — SETUP           ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# 1. Check Node
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js não encontrado. Instale Node 18+${NC}"
  exit 1
fi
NODE_VERSION=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}✗ Necessário Node.js 18+. Versão atual: $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# 2. Install deps
echo -e "\n${YELLOW}→ Instalando dependências...${NC}"
npm install

# 3. .env setup
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${GREEN}✓ Arquivo .env criado a partir do .env.example${NC}"
  echo -e "${YELLOW}⚠  Edite o .env com suas credenciais antes de continuar!${NC}"
  echo ""
  echo -e "   ${CYAN}DATABASE_URL${NC}     → URL do PostgreSQL"
  echo -e "   ${CYAN}NEXTAUTH_SECRET${NC}  → Execute: openssl rand -base64 32"
  echo -e "   ${CYAN}GOOGLE_*${NC}         → Opcional: OAuth em console.cloud.google.com"
  echo ""
  read -p "Pressione ENTER após editar o .env para continuar..."
fi

# 4. Prisma
echo -e "\n${YELLOW}→ Gerando cliente Prisma...${NC}"
npx prisma generate

echo -e "\n${YELLOW}→ Criando tabelas no banco de dados...${NC}"
npx prisma migrate dev --name init || npx prisma db push

echo -e "\n${YELLOW}→ Populando dados iniciais...${NC}"
npx prisma db seed || echo "Seed já executado ou falhou (normal em reinstalações)"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Setup concluído com sucesso!                  ║${NC}"
echo -e "${GREEN}║                                                    ║${NC}"
echo -e "${GREEN}║  Execute: npm run dev                             ║${NC}"
echo -e "${GREEN}║  Acesse:  http://localhost:3000                   ║${NC}"
echo -e "${GREEN}║                                                    ║${NC}"
echo -e "${GREEN}║  Login admin:                                     ║${NC}"
echo -e "${GREEN}║    Email: admin@magnalog.com.br                   ║${NC}"
echo -e "${GREEN}║    Senha: admin123                                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
