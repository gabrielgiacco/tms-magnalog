# MagnaLog TMS

Sistema completo de Gestão de Transporte (TMS) para carga fracionada.

## Quick Start

```bash
npm install
cp .env.example .env
# Configure DATABASE_URL e NEXTAUTH_SECRET no .env
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

## Stack
- Next.js 14 + React 18 + TypeScript
- PostgreSQL + Prisma ORM
- NextAuth.js (Google + Credenciais)
- TailwindCSS + Recharts + @dnd-kit

## Módulos
- Dashboard com KPIs e gráficos
- Importação XML NF-e (deduplicação + agrupamento automático)
- Entregas com fluxo de status visual
- Kanban drag-and-drop
- Rotas (fracionado) com gestão de entregas
- Financeiro integrado com exportação CSV
- Relatórios: mensal, anual, ranking motoristas
- Portal do Cliente com acesso por CNPJ autorizado
- Rastreamento público /entrega/[id]
- Busca global Ctrl+K
- Usuários com controle por role (Admin/Financeiro/Operacional/Cliente)



## Deploy Vercel
```bash
vercel
# Configurar: DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
```

## Deploy Docker
```bash
docker-compose up -d
```
