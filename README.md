# Qrft

Self-hosted QR-Code-Tool mit statischen Codes, dynamischen Kurzlinks, Logo-/Farboptionen, PNG/SVG-Export und Scan-Zähler.

## Lokal starten

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Die App läuft lokal auf `http://localhost:3000`.

## Dokploy mit Railpack

In Dokploy:

1. Application aus Git erstellen.
2. Build Type auf `Railpack` setzen.
3. Domain auf Container-Port `3000` legen.
4. Postgres als Dokploy-Datenbank anlegen.
5. In der App die Environment Variables unten setzen.

## Environment Variables

Auf der Dokploy-App:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@INTERNAL_HOST:5432/DATABASE
APP_BASE_URL=https://deine-domain.de
ADMIN_PASSWORD=ein-langes-passwort
DB_POOL_MAX=5
RAILPACK_BUILD_CMD=npm run build
RAILPACK_START_CMD=npm run db:migrate && npm run start
```

Wichtig: Für `DATABASE_URL` die interne Dokploy-Connection-URL verwenden, nicht die externe DB-URL. Für Preview Deployments kann `APP_BASE_URL=https://${{DOKPLOY_DEPLOY_URL}}` gesetzt werden.

`RAILPACK_START_CMD` führt die Drizzle-Migrationen aus und startet danach den Next-Standalone-Server. Die Migrationen sind idempotent und können bei Container-Neustarts erneut laufen.

Nicht setzen: `NEXT_PUBLIC_DATABASE_URL`. Secrets dürfen nie ein `NEXT_PUBLIC_` Prefix bekommen.

## Produktionscheck

```bash
npm run lint
npm run build
```

Nach dem ersten Dokploy-Deploy pruefen:

- `/api/health` liefert `ok: true`
- Logs zeigen `Database migrations completed.`
- Domain und HTTPS sind aktiv
- `APP_BASE_URL` zeigt auf genau diese Domain
- Dashboard ist mit `ADMIN_PASSWORD` geschützt
