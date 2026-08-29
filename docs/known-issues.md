# Known Issues

Recurring failures we have already diagnosed once. Check here before guessing.

Each entry: symptom as seen on the device/client, the confirmed root cause, how to
confirm it, the fix, and a longer-term fix if there is one.

---

## 1. Chat / Firestore fails with 503 "Chat authentication is unavailable"

**First diagnosed:** 2026-08-28

### Symptom

- In-app error log (dev client):
  ```
  [network] response failed
  {"method":"POST","url":"https://qa-api.toratora.site/api/chat/firebase-token/",
   "status":503,"hasAuth":true,
   "message":"Request failed with status code 503",
   "responseData":{"error":"Chat authentication is unavailable."}}
  ```
- Chat screen does not connect; Firestore reads/writes are unauthenticated because
  `signInWithCustomToken` never runs.
- Client call site: `src/lib/firebase.ts` → `authenticateFirebase()` posts to
  `FIREBASE_TOKEN_ENDPOINT` (`src/lib/config.ts`, = `SERVERURL + "chat/firebase-token/"`).
  The client is fine — this is a backend failure.

### Root cause — CONFIRMED

The QA backend (`rn-api-web-1` container on the remote host `100.107.98.80`) mints
Firebase custom tokens with **Google Application Default Credentials that are the
host user's `gcloud auth application-default login` credentials**, not a service
account key.

- `docker-compose.server.yml` (`web` service):
  - `GOOGLE_APPLICATION_CREDENTIALS: /run/secrets/google-application-default-credentials.json`
  - volume: `~/.config/gcloud/application_default_credentials.json` (host) mounted
    read-only into the container at that path.
- These are **user OAuth credentials**. Google enforces periodic reauthentication
  (observed lifetime ~1 week). When the refresh token can no longer refresh:
  - `firebase_admin.auth.create_custom_token()` has no local private key, so it
    falls back to the IAM `signBlob` API, which needs a live access token.
  - The token refresh raises:
    ```
    google.auth.exceptions.RefreshError: Reauthentication is needed.
    Please run `gcloud auth application-default login` to reauthenticate.
    ```
  - `src/chat/views.py::firebase_custom_token` catches the exception and returns
    HTTP 503 `{"error": "Chat authentication is unavailable."}`.

Note: the same 503 body is also returned when `get_firebase_app()` is falsy
(Firebase app failed to init at all). Check the traceback to tell them apart — the
reauth case shows `RefreshError` from `google/oauth2/reauth.py`.

### How to confirm

On the remote host (`ssh yash@100.107.98.80`):

```bash
# 1. Backend log shows the RefreshError traceback
docker logs rn-api-web-1 --since 2h 2>&1 | grep -A20 "Unable to create Firebase custom token"

# 2. Host ADC is expired
gcloud auth application-default print-access-token   # -> "Reauthentication is needed"

# 3. Age of the credential file (expect it to be several days old)
stat -c '%y %n' ~/.config/gcloud/application_default_credentials.json
```

### Fix

On the remote host, as user `yash`:

```bash
gcloud auth application-default login
```

Complete the browser/device auth flow (account: `build@simplyrenit.com`). This
rewrites `~/.config/gcloud/application_default_credentials.json`, which is
live-mounted into the container. `google-auth` re-reads the file on its next
refresh, so no restart is strictly required, but to be safe restart the web
container (see the exact command below — note `./restart.sh` is stale and does
NOT touch the Docker stack).

Bounce the web container. Simplest is plain `docker` (the ADC file is a live
bind mount, so a restart of the same container is enough):

```bash
docker restart rn-api-web-1
```

Do **not** use a bare `docker compose -f docker-compose.server.yml restart web` —
it fails with `required variable FIREBASE_SECRETS_FILE is missing a value`
because the server stack needs its env file. The documented compose form is:

```bash
cd ~/git/personal/rn-api
docker compose --env-file config/environments/qa.env -f docker-compose.server.yml restart web
```

Then retry chat in the app — the `firebase-token` POST should return 200 with a token.

### Longer-term fix (not yet done)

Replace the user ADC with a dedicated **Firebase service-account JSON key**
(`GOOGLE_APPLICATION_CREDENTIALS` pointing at it). A service-account key has a
private key, so `create_custom_token` signs locally and never needs reauth or the
IAM API. This removes the weekly-expiry failure mode entirely.

---

## Template for new entries

```
## N. <short symptom title>

**First diagnosed:** YYYY-MM-DD

### Symptom
<what is seen on the client/device, verbatim error text if available>

### Root cause — CONFIRMED / SUSPECTED
<the actual cause and where it lives>

### How to confirm
<exact commands / checks>

### Fix
<step-by-step>

### Longer-term fix (if any)
<...>
```
