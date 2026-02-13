# SIGEA

Sistema de Gestion Documental para Audiencias con flujo **Flagrancia -> Litigacion** y una sola plantilla de ficha para salida documental en **PPTX/PDF**.

## Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, componentes estilo shadcn/ui, lucide-react
- Formularios: react-hook-form + zod
- Feedback UI: sonner
- Backend: Next.js Route Handlers (`/app/api/...`)
- ORM/DB: Prisma + PostgreSQL
- DocGen: pptxgenjs + @react-pdf/renderer
- DevOps: Docker, Docker Compose, GitHub Actions, deploy por SSH (`appleboy/ssh-action`)

## Flujo funcional

1. Flagrancia o MP crea un caso.
2. Flagrancia o MP crea ficha en `DRAFT`.
3. Flagrancia/MP envian ficha a `READY`.
4. Litigacion revisa y edita ficha existente (sin crear/borrar).
5. Supervisor decide `APPROVED` o `NEEDS_CHANGES`.
6. Si hay cambios, Flagrancia/MP corrigen y reenvian `READY`.

Estados:

- `DRAFT`
- `READY`
- `NEEDS_CHANGES`
- `APPROVED`

## Roles y permisos implementados

- `FLAGRANCIA`: CRUD casos, CRUD fichas, evidencias, `READY`, generar PPTX/PDF.
- `MP`: CRUD casos, CRUD fichas, evidencias, `READY`, generar PPTX/PDF.
- `LITIGACION`: leer casos, editar fichas existentes, sin crear/borrar fichas, `READY` configurable.
- `SUPERVISOR`: revision, cambia `READY -> APPROVED` o `READY -> NEEDS_CHANGES` (con comentario).
- `ADMIN`: acceso total, incluyendo usuarios/catalogos y operaciones administrativas.

Configurables por env:

- `LITIGACION_CAN_SET_READY`
- `LITIGACION_CAN_ADD_EVIDENCE`
- `LITIGACION_CAN_DELETE_EVIDENCE`

## Ficha unica (payload canonico)

La ficha usa un solo payload para UI, API y documentos.

```json
{
  "agencyName": "FISCALIA DE INVESTIGACION METROPOLITANA",
  "reportTitle": "REPORTE DE PARTICIPACION MINISTERIAL EN AUDIENCIA JUDICIAL",
  "templateVersion": "v1",
  "expedientes": {
    "cdi": "CDI-001",
    "cp": "CP-001",
    "carpetaJudicial": "",
    "juicioOral": ""
  },
  "fechaHora": {
    "fecha": "13 DE FEBRERO DE 2026",
    "horaProgramada": "HORA PROGRAMADA: 09:00",
    "horaInicio": "09:10",
    "horaTermino": "10:00"
  },
  "delito": { "nombre": "ROBO CALIFICADO" },
  "imputado": { "nombreCompleto": "JUAN PEREZ" },
  "ofendido": { "nombreCompleto": "MARIA LOPEZ" },
  "hecho": { "descripcion": "Descripcion narrativa de al menos 20 caracteres para READY" },
  "audiencia": {
    "tipo": "CONTROL DE DETENCION",
    "etapa": "PROCEDIMIENTO INICIAL",
    "modalidad": "PRESENCIAL"
  },
  "autoridades": {
    "juez": "JUEZ 1",
    "mp": "MP ADSCRITO",
    "defensa": "",
    "asesorJuridico": "",
    "observacion": ""
  },
  "resultado": { "descripcion": "Resultado de la audiencia" },
  "medidaCautelar": {
    "descripcion": "NO APLICA",
    "tipo": "",
    "fundamento": ""
  },
  "observaciones": {
    "texto": "",
    "relevancia": "MEDIA",
    "violenciaGenero": false
  }
}
```

Validacion `READY` (backend + frontend):

- Obligatorios: `expedientes.cdi`, `expedientes.cp`, `fechaHora.fecha`, `fechaHora.horaProgramada`, `delito.nombre`, `imputado.nombreCompleto`, `ofendido.nombreCompleto`, `audiencia.tipo`, `autoridades.juez`, `autoridades.mp`, `resultado.descripcion`, `medidaCautelar.descripcion`.
- `hecho.descripcion` minimo 20 caracteres.
- `horaInicio`/`horaTermino` con regex de hora si existen.

## Documentos (PPTX/PDF)

- Plantilla base: `assets/templates/sigea_template.pptx`
- Servicio server-side:
  - `src/server/docgen/service.ts`
  - `src/server/docgen/template.ts`
- Mapeo de 11 secciones implementado (`section1..section11`).
- `fitText()` reduce font-size y trunca con `...` si aun hay overflow.

## API principal

Casos:

- `GET /api/cases`
- `POST /api/cases`
- `GET /api/cases/:id`
- `PATCH /api/cases/:id`
- `DELETE /api/cases/:id`
- `GET /api/cases/:id/records`
- `POST /api/cases/:id/records`

Fichas:

- `GET /api/records/:id`
- `PATCH /api/records/:id`
- `DELETE /api/records/:id`
- `POST /api/records/:id/status`

Evidencias:

- `POST /api/records/:id/evidence`
- `GET /api/evidence/:id/download`
- `DELETE /api/evidence/:id`

Notificaciones:

- `GET /api/notifications`
- `POST /api/notifications/:id/read`

Reportes:

- `GET /api/reports/kpis`

Artefactos:

- `POST /api/records/:id/generate?format=pptx|pdf`
- `GET /api/artifacts/:id/download`

Administracion (ADMIN):

- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/catalogs`
- `POST /api/catalogs`
- `GET /api/catalogs/:id`
- `PATCH /api/catalogs/:id`
- `DELETE /api/catalogs/:id`

## Auditoria y notificaciones

- Auditoria en tabla `AuditLog` por acciones `CREATE/UPDATE/DELETE/STATUS_CHANGE/EVIDENCE/GENERATE_ARTIFACT` con `diffJson`.
- Notificaciones internas en tabla `Notification` para eventos:
  - `RECORD_CREATED`
  - `RECORD_UPDATED`
  - `RECORD_READY_FOR_REVIEW`
  - `RECORD_NEEDS_CHANGES`
  - `RECORD_APPROVED`
  - `EVIDENCE_ADDED`

## Estructura destacada

- `src/app/(auth)/login/page.tsx`
- `src/app/(app)/cases/page.tsx`
- `src/app/(app)/cases/[id]/page.tsx`
- `src/app/(app)/records/[id]/page.tsx`
- `src/app/api/...`
- `src/server/docgen/...`
- `src/server/services/...`
- `prisma/schema.prisma`
- `prisma/migrations/0001_init/migration.sql`

## Setup local (sin Docker)

1. Instalar dependencias:

```bash
npm install
```

2. Configurar variables:

```bash
cp .env.example .env
```

3. Levantar PostgreSQL (local o docker) y aplicar migraciones:

```bash
npm run db:migrate:deploy
```

4. Seed inicial:

```bash
npm run db:seed
```

5. Ejecutar app:

```bash
npm run dev
```

## Setup con Docker Compose

```bash
docker compose up -d --build
```

La app corre en `http://localhost:3000`.

## Setup con Caddy + HTTPS (.sslip)

1. Copia variables de deploy:

```bash
cp .env.deploy.example .env.deploy
```

2. Edita `.env.deploy` y define:

- `SIGEA_DOMAIN` como `sigea.<IP_PUBLICO_SERVIDOR>.sslip.io`
- `ACME_EMAIL`
- `AUTH_SECRET`
- `POSTGRES_PASSWORD`
- `PROJECT_NAME` unico (ej. `sigea-v1`)

3. Si el servidor ya usa 80/443 para otras instancias, cambia:

- `SIGEA_HTTP_PORT`
- `SIGEA_HTTPS_PORT`

4. Levanta el stack aislado:

```bash
docker compose -p sigea-v1 -f docker-compose.deploy.yml --env-file .env.deploy up -d --build
```

5. Ejecuta migraciones:

```bash
docker compose -p sigea-v1 -f docker-compose.deploy.yml --env-file .env.deploy exec -T app npm run db:migrate:deploy
```

Este despliegue no toca otras instancias porque usa proyecto/volumenes/redes dedicadas y no hace `down` global.

Si tu servidor ya tiene Caddy en 80/443, usa solo `app+db` y enruta desde Caddy host:

- `SIGEA_APP_PORT=3100` en `.env.deploy`
- agrega sitio en `/etc/caddy/Caddyfile`:

```caddy
sigea.146.19.143.92.sslip.io {
  encode gzip
  reverse_proxy 127.0.0.1:3100
}
```

- valida y recarga:

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

## Usuarios demo (seed)

Password para todos: `Sigea123!`

- `flagrancia@sigea.local`
- `mp@sigea.local`
- `litigacion@sigea.local`
- `supervisor@sigea.local`
- `admin@sigea.local`

## Scripts

- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run db:generate`
- `npm run db:migrate:dev`
- `npm run db:migrate:deploy`
- `npm run db:seed`
- `npm run db:push`
- `npm run template:generate`

## CI/CD por ramas

- CI: `.github/workflows/ci.yml`
  - corre en `development`, `staging`, `main` y PRs
  - ejecuta `lint` + `build`
- Deploy: `.github/workflows/deploy.yml`
  - `development` -> servidor dev (SSH)
  - `staging` -> servidor staging (SSH)
  - `main` -> servidor prod (SSH)
  - ejecuta `/opt/sigea/deploy.sh <branch>`

Secrets esperados:

- `DEV_SSH_HOST`, `DEV_SSH_USER`, `DEV_SSH_KEY`
- `STAGING_SSH_HOST`, `STAGING_SSH_USER`, `STAGING_SSH_KEY`
- `PROD_SSH_HOST`, `PROD_SSH_USER`, `PROD_SSH_KEY`

## Deploy remoto

Script incluido: `deploy/deploy.sh`

Pasos que ejecuta:

1. `git fetch` / `checkout` de rama
2. `git pull`
3. carga `.env.<branch>` o `.env.deploy`
4. `docker compose -p $PROJECT_NAME -f docker-compose.deploy.yml --env-file .env build app`
5. `docker compose -p $PROJECT_NAME -f docker-compose.deploy.yml --env-file .env up -d`
6. `docker compose -p $PROJECT_NAME -f docker-compose.deploy.yml --env-file .env exec -T app npm run db:migrate:deploy`
