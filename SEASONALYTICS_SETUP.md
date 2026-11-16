# Seasonalytics deployment

This fork runs one Umami instance for multiple sites. The first registered site is giaquinto.dev.

## Hosting

- Netlify project: mc-seasonalytics (Free Legacy team saveyh).
- Supabase project: lapgnbdcmnpfupatjykg (London, Free organization).
- Production branch: master. Keep the existing Legacy plan.
- Build: `pnpm build && node scripts/initialize-seasonalytics.mjs`.
- Publish directory: `.next`.
- `.netlify/` is ignored; never commit local site-linking state or credentials.

## Private environment variables

Enter the real values in Netlify's environment variable settings:

- `DATABASE_URL`: Supabase transaction pooler URI (port 6543), with `schema=umami`.
- `DIRECT_DATABASE_URL`: Supabase session pooler URI (port 5432), with `schema=umami`, for migrations.
- `APP_SECRET`: a unique random secret, at least 32 random bytes.
- `SEASONALYTICS_ADMIN_PASSWORD`: a unique password of at least 16 characters.

Use the exact pooler hostname displayed by Supabase's Connect dialog. Percent-encode the PostgreSQL password when inserting it into a URI. Do not reuse a publishable/anon API key as a PostgreSQL password.

Before the first migration, create the schema in the Supabase SQL editor:

```sql
create schema if not exists umami authorization postgres;
revoke all on schema umami from public, anon, authenticated;
```

Keep `umami` out of the schemas exposed by the Supabase Data API. Umami connects through PostgreSQL, not the Data API.

The post-build initializer refuses a non-private schema and replaces the upstream admin password before publication. Subsequent builds preserve a changed administrator password. Sign in with username `admin` and the password entered above.

## Portfolio

The initializer creates website ID `fdbb6d50-69f0-4a16-b509-42187da42eb1`.
After a successful deployment and collection test, set these public variables on the portfolio's **production** context:

- `NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://mc-seasonalytics.netlify.app/script.js`
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID=fdbb6d50-69f0-4a16-b509-42187da42eb1`

The portfolio integration is disabled until these are configured. Replays and persistent user identification are not enabled.

## Remaining operational checks

- Verify login and ingestion before enabling the portfolio's production integration.
- Configure and verify a 90-day retention job after the database exists; no retention job has been installed by this setup file.
- Confirm backups and actual quota consumption after the pilot.
- The Netlify project's quotas are shared with the team's other sites; there is no separate quota allocation per project.
- Review the site's privacy information and applicable audience-measurement requirements before extending collection.
