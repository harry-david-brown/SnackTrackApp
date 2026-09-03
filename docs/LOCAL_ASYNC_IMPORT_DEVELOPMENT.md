# Local async-import development

The backend's Compose file is the single local infrastructure owner. From `SnackTrackApp`, run:

```sh
npm run backend:start
npm run dev
```

The first command starts PostgreSQL, Redis, MinIO, migrations, the API, and an import worker. The second forwards both the API and MinIO ports to an Android device/emulator and starts Expo.

MinIO is part of the security test path, not just a convenience: provider-bound signed uploads, observed byte length, ETag pinning, conditional downloads, and worker streaming all run locally. The app measures the copied file's filesystem size; the API and worker independently enforce their own limits.

Imports continue when the app leaves the upload screen. Local push delivery is logged by the worker. Use an Expo development build and configured APNs/FCM credentials to exercise real remote notifications; Expo Go is not a production push-notification test environment.

Use `npm run backend:logs` to follow API and worker progress. `npm run backend:stop` preserves local volumes. `npm run backend:reset` deletes the local PostgreSQL, Redis, and MinIO volumes and should only be used when a clean data reset is intentional.

## Redis outage and recovery checks

The API and worker processes are allowed to start while Redis is unavailable. The API remains live with a degraded `/health` response, new import requests remain durable in PostgreSQL with the `waiting_for_queue` phase, and lock-dependent workers wait instead of consuming normal job attempts. Notification delivery uses its separate queue connection.

To exercise recovery locally, stop only the Redis service while leaving the API and worker running, start an import, and then restart Redis. The API cache/lock connection and BullMQ reconnect automatically. Projection caches are reconciled before cache reads resume, the PostgreSQL outbox publishes the delayed import, and the workers continue without process restarts. A refresh-token request made during the outage receives retryable `SESSION_STORE_UNAVAILABLE`; the app keeps its local session and can retry after Redis returns.

The admin System page polls queue state every 10 seconds. Operators can monitor Redis, BullMQ, durable job counts, and unpublished outbox age. Owners can cancel pending, queued, and retrying imports with an audited reason and exact confirmation phrase; running imports and uploads that have not been submitted are intentionally excluded.

For iOS Simulator, start Expo with `npm start`; localhost is directly reachable. For physical devices, set the API URL and `OBJECT_STORAGE_PUBLIC_ENDPOINT` to the development computer's LAN address.

Mailbox mock fixtures use the same page size, sender/body limits, forwarding exception, and sanitization as production. Use synthetic messages only. The full threat model, limits, operator exception, and release checklist are in `SnackTrackAPI/docs/IMPORT_INPUT_SECURITY.md`.
