# TCC — Plataforma de Home Care (Backend + Web Admin + Mobile)

Sistema para **agendamento e acompanhamento de atendimentos domiciliares** (home care), composto por:
- **Backend (`back/`, Node.js + Express + EJS)**: API REST, autenticação por sessão e painel administrativo (EJS).
- **Web (`Web/`)**: pasta reservada para front-end web adicional (se aplicável).
- **Mobile (`home_care_paciente/`, Flutter)**: app do paciente (login, home, minha agenda).

> **Escopo atual**: Sem módulo de logística/rotas. Foco em autenticação, agenda, perfis e base de relatórios.  
> **Última atualização**: 07/10/2025 (America/Sao_Paulo)

---

## Sumário
- [Arquitetura](#arquitetura)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Funcionalidades (MVP)](#funcionalidades-mvp)
- [Tecnologias](#tecnologias)
- [Requisitos](#requisitos)
- [Como executar (TL;DR)](#como-executar-tldr)
- [Backend — Configuração (.env)](#backend--configuração-env)
- [Web Admin (EJS)](#web-admin-ejs)
- [Mobile (Flutter)](#mobile-flutter)
- [API — Endpoints (guia)](#api--endpoints-guia)
- [Relatórios (desenho atual)](#relatórios-desenho-atual)
- [Coleção Postman](#coleção-postman)
- [Segurança](#segurança)
- [Boas práticas & Troubleshooting](#boas-práticas--troubleshooting)
- [Roadmap curto](#roadmap-curto)
- [Licença](#licença)

---

## Arquitetura

```
[Mobile Flutter] ───────> [API Express + Sessão + Views EJS] ───────> [Banco de Dados]
          ↑                         │
          └─────────── (/public + uploads locais) ───────────┘
```

- Uma app **Express** serve:
  - **API REST** (`/api/...`)
  - **Views EJS** (painel admin: `/auth/login`, `/admin`, etc.)
  - **Arquivos estáticos** em `/public`
  - **Uploads** em `./uploads`

---

## Estrutura do repositório

```
.
├── back/                              # API + Web Admin (EJS)
│   ├── src/
│   │   ├── server.js                  # Express (Helmet, sessão, estáticos, EJS)
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   └── admin.routes.js
│   │   ├── views/                     # Páginas EJS
│   │   ├── config/
│   │   │   └── permissions.js         # RBAC (ROLE_PERMISSIONS, roleHas)
│   │   └── ...
│   ├── public/                        # CSS/JS/Imagens (estáticos)
│   ├── uploads/                       # Uploads (criar se não existir)
│   ├── package.json
│   └── .env.example
├── Web/                               # (Opcional) front-end web adicional
├── home_care_paciente/                # App Flutter (paciente)
│   ├── lib/
│   │   ├── core/
│   │   │   ├── colors.dart
│   │   │   └── constants.dart         # API_BASE_URL
│   │   ├── screens/
│   │   │   ├── login_screen.dart
│   │   │   ├── home_screen.dart
│   │   │   └── minha_agenda_screen.dart
│   │   └── widgets/
│   ├── pubspec.yaml
│   └── android/ ios/
├── TCC Homecare API — Coleção Única (pt-BR).postman_collection.json
└── README.md
```

---

## Funcionalidades (MVP)

- Autenticação por **sessão** (backend) e **RBAC** (perfis/papéis).
- Gestão: **pacientes**, **profissionais**, **agendamentos**.
- **Agenda** com status: agendado, confirmado, concluído, cancelado.
- **Relatórios (MVP)**:
  - KPIs (total, concluídos, cancelados, no-show, comparecimento %).
  - Tabela filtrável (período/profissional/status) + **Export CSV**.
- **Mobile (Flutter)** do paciente:
  - Login (CPF/senha de exemplo), **Home**, **Minha Agenda** (com seta para voltar).

---

## Tecnologias

- **Backend**: Node.js 18+, Express, EJS, express-session, Helmet.
- **Web Admin**: EJS + assets estáticos (servidos pelo backend).
- **Mobile**: Flutter 3.x+, Dart.
- **Banco**: ajustável (SQLite/Postgres/MySQL) via `.env`.

---

## Requisitos

- **Node.js** >= 18 e **npm** (ou yarn)
- **Flutter** >= 3.x (Android SDK/iOS configurados)
- Banco de dados local (SQLite) ou serviço (Postgres/MySQL)
- Porta padrão `3000` livre

---

## Como executar (TL;DR)

```bash
# 1) Backend (API + Web Admin)
cd back
cp .env.example .env          # edite conforme sua máquina
npm install
npm run dev                   # ou: node src/server.js
# Acesse: http://localhost:3000

# 2) Mobile (Flutter - app do paciente)
cd ../home_care_paciente
# Edite lib/core/constants.dart com a URL do backend (ver abaixo)
flutter pub get
flutter run                   # selecione emulador/dispositivo
```

---

## Backend — Configuração (.env)

Crie `back/.env` a partir de `back/.env.example`:

```ini
# App
PORT=3000

# Sessão (troque em produção)
SESSION_SECRET=uma-chave-segura-em-dev

# Banco de Dados (escolha um modo)
# MODE 1: URL única (ex.: Postgres)
# DATABASE_URL=postgres://usuario:senha@localhost:5432/tcc

# MODE 2: Campos individuais
DB_CLIENT=sqlite           # sqlite | pg | mysql
DB_HOST=localhost
DB_PORT=5432
DB_USER=usuario
DB_PASSWORD=senha
DB_NAME=tcc

# Arquivos
UPLOADS_DIR=./uploads

# CORS (se consumir API de outro domínio/porta)
# CORS_ENABLED=false
# CORS_ORIGIN=http://localhost:5173
```

> **Pastas obrigatórias**  
> - `back/public/` (estáticos servidos em `/public/...`)  
> - `back/uploads/` (crie se não existir)

### Scripts (exemplo)

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "lint": "eslint .",
    "test": "jest"
  }
}
```

---

## Web Admin (EJS)

- Acesse `http://localhost:3000`
- Rotas comuns:
  - `/auth/login` — login do painel
  - `/admin` — dashboard/admin (agenda, pacientes, profissionais)
- Permissões: ver `src/config/permissions.js` (`ROLE_PERMISSIONS` e `roleHas()`).
- Estáticos: tudo em `back/public/` é servido em `/public/...`.
- Uploads: pasta `back/uploads/`.

---

## Mobile (Flutter)

### Configurar `API_BASE_URL` (constants.dart)

Arquivo: `home_care_paciente/lib/core/constants.dart`

```dart
// lib/core/constants.dart
class AppConstants {
  // Emulador Android: 10.0.2.2 aponta para o host
  static const String apiBaseUrl = "http://10.0.2.2:3000";

  // iOS Simulator geralmente funciona com localhost
  // static const String apiBaseUrl = "http://localhost:3000";

  // Dispositivo físico: use o IP da sua máquina na mesma rede
  // static const String apiBaseUrl = "http://192.168.0.10:3000";
}
```

No Android, garanta a permissão de Internet:

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
```

Comandos úteis:

```bash
flutter pub get
flutter devices
flutter emulators --launch <id>
flutter run
# Se der cache estranho:
flutter clean && flutter pub get
```

---

## API — Endpoints (guia)

> A API real pode ter variações; abaixo um guia de referência do que existe/está planejado.

**Auth**
- `POST /auth/login` — cria sessão
- `POST /auth/logout` — encerra sessão

**Agenda/Atendimentos**
- `GET /api/agendamentos?from=&to=&profissionalId=&status=`
- `POST /api/agendamentos`
- `PATCH /api/agendamentos/:id` — atualizar status (`agendado|confirmado|concluido|cancelado`)

**Relatórios (MVP)**
- `GET /api/reports/agenda-resumo?from=YYYY-MM-DD&to=YYYY-MM-DD&profissionalId=&status=`
- `GET /api/reports/atendimentos?from=&to=&profissionalId=&status=&page=&pageSize=`
- `GET /api/reports/export/csv?type=atendimentos&from=&to=&...`

Exemplos:

```bash
# Login
curl -X POST http://localhost:3000/auth/login   -H "Content-Type: application/json"   -d '{"cpf":"83272912037","senha":"admin"}'

# Agendamentos (filtro por período)
curl "http://localhost:3000/api/agendamentos?from=2025-10-01&to=2025-10-31"
```

---

## Relatórios (desenho atual)

- **KPIs**: total de atendimentos, concluídos, cancelados, no-show, comparecimento (%), duração média.  
- **Tabela detalhada**: Data/Hora, Paciente, Profissional, Tipo, Status, Duração, Nota, Valor.  
- **Export CSV** respeitando filtros.  
- **Filtros**: período, profissional, status, tipo.

> Próximos passos: produtividade por profissional, satisfação (NPS/nota), financeiro.

---

## Coleção Postman

Arquivo: **`TCC Homecare API — Coleção Única (pt-BR).postman_collection.json`** (na raiz).  
Importe no Postman/Insomnia para testar os endpoints rapidamente.

---

## Segurança

- Cookies de sessão com **`httpOnly`** e **`express-session`**.
- **Helmet** habilitado (ajuste CSP quando usar CDN/iframes).
- **RBAC** via `ROLE_PERMISSIONS` e `roleHas`.
- Em produção:  
  - Store de sessão persistente (Redis), `SESSION_SECRET` forte, HTTPS atrás de proxy.

---

## Boas práticas & Troubleshooting

- **Paginação** server-side em listas e relatórios.
- **Índices** em banco por `data`, `profissional_id`, `status`.
- **Cache** leve (5–10 min) para KPIs agregadas.
- **Erros comuns**:
  - *Mobile não conecta*: emulador Android usa `http://10.0.2.2:3000`; device físico usa IP da máquina (libere firewall).
  - *404 para imagens/arquivos*: verifique assets em `back/public/` e o mapeamento de estáticos no `server.js`.
  - *Uploads não aparecem*: crie `back/uploads/` e verifique permissões.
  - *Sessão não persiste*: defina `SESSION_SECRET`; em prod use Redis.
  - *CORS bloqueando*: habilite `CORS_ENABLED=true` e defina `CORS_ORIGIN`.

---

## Roadmap curto

1. Consolidar **Relatórios** (KPIs + CSV).  
2. Área do **Profissional** no mobile (meus atendimentos).  
3. (Opcional) Migrar Web Admin para **SPA** (React/Vue).  
4. **Logística** (rotas, ETA, “a caminho” em tempo real).

---

## Licença

Projeto acadêmico/experimental. Defina a licença conforme sua necessidade (ex.: MIT).
