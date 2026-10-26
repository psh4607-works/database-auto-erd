# Local PostgreSQL workspace

This fork adds a local workspace to Liam ERD. It stores PostgreSQL connections, collects schema metadata on demand, compares the current and previous successful snapshots, and keeps diagram settings separately.

## Run on this Mac

Requirements: OrbStack Docker, Node 22, and the pnpm version pinned in `package.json`.

```sh
pnpm local:setup
pnpm local:start
```

Open <http://127.0.0.1:3400>. Compose publishes the application on loopback only. Nginx, Kubernetes, PM2, cloud deployment, and a separate application database server are not required.

```sh
docker compose ps
pnpm local:logs
pnpm local:stop
docker compose start
```

`local:start` builds the production app. `restart: unless-stopped` restores it when Docker restarts, unless you explicitly stopped it.

## Connect and refresh

1. Add a PostgreSQL connection and test it. For a database published on this Mac, use `host.docker.internal` and the published port, not `localhost` inside the container. TLS mode verifies the server certificate.
2. Save the connection and select **Refresh schema**. The app reads catalog metadata in a read-only transaction with connection and statement timeouts. It never writes DDL or table data to the source database.
3. Search tables, choose a schema, and focus related tables with the existing Liam controls.
   The sidebar groups tables under collapsible schema headings. The canvas uses labeled, lightly shaded schema regions and shows short table names; internal qualified names and relationships remain unchanged. Tidy up arranges each schema separately. Regions follow visible tables as they move or hide.
4. Move or hide tables, then use **Save view**. Refresh also saves the current layout first. Notes, colors, groups and logical relationships have their own save controls.
5. **Compare last refresh** shows schema changes against the previous successful snapshot, including removed tables. Dashed purple edges are logical relationships, separate from actual foreign keys.

A failed refresh preserves the last successful schema and its timestamp. A concurrent edit from another window is rejected rather than silently overwritten. Missing logical relationship endpoints and annotations remain stored for later recovery. New tables are placed beyond saved table positions.

## Persistence and backup

- The Compose `workspace` volume holds SQLite data, including encrypted passwords, snapshots and diagram settings.
- `.local/credential-key` is a generated 32-byte AES-256-GCM key mounted as a read-only Docker secret. Preserve it; generating another key cannot decrypt existing passwords.
- `docker compose stop`, restart, and rebuild preserve data. **Do not use `docker compose down -v` when you want to keep your work.**
- Back up the volume while the app is stopped, together with the key file. Never put these in Git. The project-local `docs/CREDENTIALS.md` contains storage references only.
- This is a single-user local app. Before allowing access from another machine, add authentication and revisit the network boundary.

## Validation

Run `pnpm fmt`, `pnpm lint`, and `pnpm test` with Node 22. Live PostgreSQL integration tests use an isolated test database whose URL is supplied as `ERD_TEST_DATABASE_URL`:

```sh
pnpm --filter @liam-hq/app exec vitest run features/workspace/server
```

The live test creates tables only in `erd_test` on that test database. Do not point it at a production database. Without the environment variable, that integration test is skipped. Pass the variable directly to this command; Turbo's environment filtering does not forward it automatically.
