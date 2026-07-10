# CI/CD Guide

GitHub Actions pipeline is defined in `.github/workflows/ci.yml`.

## CI pipeline steps

The CI job runs without real secrets and without live MySQL:

1. Checkout
2. Setup Node.js 20
3. `npm ci`
4. `npm run verify:ci`
5. `npm run smoke:nodb`

`npm run verify:ci` runs:

- syntax checks for `src` and `scripts`
- `node --check server.js`
- schema contract verification
- panel validation
- route inventory check
- enterprise flow simulation
- production security check
- `npm audit --omit=dev`

## Why CI uses no-DB mode

Real production secrets and provider keys must not be placed in CI by default. The pipeline proves source-level stability and no-DB startup. Live MySQL/AI/SMS validation is performed separately with `npm run live:verify` in a controlled environment.

## Deployment gate recommendation

Before deployment, require all of the following:

```bash
npm run verify:ci
npm run live:verify
RUN_REAL_AI_TEST=true npm run live:verify
RUN_REAL_SMS_TEST=true TEST_SMS_RECIPIENT=09123456789 npm run live:verify
```

If any command fails, do not deploy until the failure is fixed or explicitly documented as an external provider outage.
