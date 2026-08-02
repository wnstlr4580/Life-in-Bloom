# Cloudflare Workers deployment

This application is deployed with the OpenNext Cloudflare adapter. The existing
Supabase PostgreSQL database remains unchanged; public user uploads are stored in
Cloudflare R2.

## One-time account setup

1. Log in and create the upload bucket:

   ```powershell
   npx wrangler login
   npx wrangler r2 bucket create life-in-bloom-uploads
   ```

2. In **R2 > life-in-bloom-uploads > Settings**, connect a production custom
   domain such as `uploads.example.com`. The `r2.dev` URL is suitable only for
   testing.

3. In **Workers & Pages > Create application > Import a repository**, select
   this GitHub repository. Use these commands:

   - Build command: `npm run build:cloudflare`
   - Deploy command: `npx wrangler deploy`

4. Copy the values from the existing production environment into the Worker's
   **Settings > Variables and Secrets**. Add `R2_PUBLIC_BASE_URL` with the R2
   custom-domain origin, for example `https://uploads.example.com`. Do not copy
   `BLOB_READ_WRITE_TOKEN`; it is no longer used.

5. Update production callback/origin values for the new site URL, especially
   `NEXTAUTH_URL`, OAuth provider callback URLs, PortOne origins, and any Kakao or
   Naver allowed domains.

## Local checks

Copy `.dev.vars.example` to `.dev.vars`, fill it with development values, then:

```powershell
npm run cf-typegen
npm run preview:cloudflare
```

OpenNext recommends WSL on Windows. Cloudflare's Git build environment is Linux,
so the repository build is the source of truth for the final Worker bundle.

## Team operations and logs

Invite collaborators from **Manage Account > Members** and scope their role to
the Workers project. Runtime logs are enabled in `wrangler.jsonc` at 100% head
sampling. Team members can use:

- **Workers & Pages > life-in-bloom > Observability** for stored/searchable logs.
- **Workers & Pages > life-in-bloom > Logs > Live** for real-time debugging.
- `npx wrangler tail life-in-bloom` for terminal-based live logs.

Never log access tokens, passwords, authorization headers, full request bodies,
or personal data. Prefer structured JSON logs with request IDs and status codes.

## Rollout checklist

- Deploy first to the generated `workers.dev` URL.
- Test sign-in, sign-up, checkout/payment verification, image uploads, kiosk
  uploads, admin pages, and scheduled endpoints.
- Confirm new R2 image URLs load publicly.
- Add the production custom domain only after smoke tests pass.
- Keep the Vercel deployment available until the Cloudflare smoke test is done;
  then change DNS and retain a rollback path for at least one release.
