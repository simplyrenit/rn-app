# Beta Launch Guide

Step-by-step guide to launch Renit for beta users using Cloudflare Tunnel for the backend and EAS for app distribution.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Backend Preparation](#2-backend-preparation)
3. [Cloudflare Tunnel Setup](#3-cloudflare-tunnel-setup)
4. [AWS / S3 Setup](#4-aws--s3-setup)
5. [App Configuration](#5-app-configuration)
6. [Build the App with EAS](#6-build-the-app-with-eas)
7. [Distribute to Beta Testers](#7-distribute-to-beta-testers)
8. [Post-Launch Monitoring](#8-post-launch-monitoring)
9. [Checklist](#9-checklist)

---

## 1. Prerequisites

- [ ] Domain name (e.g., `simplyrenit.com`) added to Cloudflare
- [ ] Apple Developer Account ($99/year) — required for iOS TestFlight
- [ ] Google Play Console ($25 one-time) — required for Android distribution
- [ ] Expo account — sign up at https://expo.dev
- [ ] AWS account with S3 access
- [ ] Firebase project configured (auth, firestore, storage)

---

## 2. Backend Preparation

### 2.1 Environment Configuration

Update `/rn-api/rn-api/.env` with production-ready values:

```env
# AWS (use dedicated production credentials)
AWS_ACCESS_KEY_ID=<prod-access-key>
AWS_SECRET_ACCESS_KEY=<prod-secret-key>
AWS_STORAGE_BUCKET_NAME=<prod-bucket-name>
AWS_S3_REGION_NAME=<bucket-region>
AWS_CLOUDFRONT_DOMAIN=<cloudfront-or-s3-domain>

# Django
DJANGO_SECRET_KEY=<generate-a-strong-secret-key>

# Database (local PostgreSQL via Docker)
DB_NAME=rn_api
DB_USER=rn_api
DB_PASSWORD=<strong-password>
DB_HOST=db
DB_PORT=5432

# Redis (local via Docker)
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
```

### 2.2 Generate a Strong Django Secret Key

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 2.3 Start the Backend

```bash
cd /home/yash/git/personal/rn-api/rn-api
docker compose down
docker compose up -d
```

### 2.4 Verify Backend is Running

```bash
curl http://localhost:8000/api/
```

---

## 3. Cloudflare Tunnel Setup

### 3.1 Install Cloudflared

```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

### 3.2 Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This opens a browser to authorize your Cloudflare account.

### 3.3 Create a Tunnel

```bash
cloudflared tunnel create renit-api
```

Note the tunnel UUID from the output — you'll need it for the config.

### 3.4 Configure the Tunnel

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /home/yash/.cloudflared/<TUNNEL_UUID>.json

ingress:
  - hostname: api.simplyrenit.com
    service: http://localhost:8000
  - service: http_status:404
```

### 3.5 Route DNS

```bash
cloudflared tunnel route dns renit-api api.simplyrenit.com
```

### 3.6 Start the Tunnel

```bash
cloudflared tunnel run renit-api
```

### 3.7 Set Up as a Systemd Service (auto-start on boot)

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

### 3.8 Verify

```bash
curl https://api.simplyrenit.com/api/
```

---

## 4. AWS / S3 Setup

### 4.1 Create a Production S3 Bucket

```bash
aws s3 mb s3://<prod-bucket-name> --region <region>
```

### 4.2 Disable Public Access Block

```bash
aws s3api put-public-access-block \
  --bucket <prod-bucket-name> \
  --public-access-block-configuration \
  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

### 4.3 Set Bucket Policy (Public Read)

```bash
aws s3api put-bucket-policy --bucket <prod-bucket-name> --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicRead",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::<prod-bucket-name>/*"
  }]
}'
```

### 4.4 Enable CORS

```bash
aws s3api put-bucket-cors --bucket <prod-bucket-name> --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }]
}'
```

### 4.5 (Optional) Set Up CloudFront

For better performance, create a CloudFront distribution in front of the S3 bucket. Update `AWS_CLOUDFRONT_DOMAIN` in `.env` with the CloudFront domain.

Without CloudFront, use the S3 domain directly:
```
<bucket-name>.s3.<region>.amazonaws.com
```

---

## 5. App Configuration

### 5.1 Update API URLs

In `src/lib/config.ts`, set `DEV_MODE` to `"PROD"` and verify the production URLs:

```typescript
export const DEV_MODE: string = "PROD";

// These should already be set:
// SERVERURL = "https://api.simplyrenit.com/api/"
// SOCKET_URL = "wss://api.simplyrenit.com/ws/chat/"
```

### 5.2 Update `app.json` / `app.config.js`

Verify the following fields are set correctly:

```json
{
  "expo": {
    "name": "Renit",
    "slug": "renit",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.simplyrenit.app",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.simplyrenit.app",
      "versionCode": 1,
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

### 5.3 Configure EAS

```bash
npx expo install eas-cli
eas login
eas build:configure
```

This generates `eas.json`. Ensure it has a `preview` profile:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

### 5.4 Set Up EAS Secrets (for sensitive keys)

```bash
eas secret:create --name GOOGLE_MAP_API_KEY --value "<your-key>"
```

---

## 6. Build the App with EAS

### 6.1 Android Build (APK for direct sharing)

```bash
eas build --platform android --profile preview
```

This produces an APK file you can download and share directly.

### 6.2 iOS Build (for TestFlight)

```bash
eas build --platform ios --profile preview
```

### 6.3 Submit iOS Build to TestFlight

```bash
eas submit --platform ios
```

---

## 7. Distribute to Beta Testers

### Android

**Option A: Direct APK** — Share the APK download link from EAS with testers.

**Option B: Google Play Internal Testing**
1. Go to Google Play Console > Internal Testing
2. Upload the AAB (use `production` profile instead of `preview`)
3. Add tester email addresses
4. Share the opt-in link with testers

### iOS

1. Go to App Store Connect > TestFlight
2. After the build is processed, add internal testers (up to 25) or external testers (up to 10,000)
3. Testers receive an email to install via the TestFlight app

---

## 8. Post-Launch Monitoring

### 8.1 Error Tracking (Recommended: Sentry)

Install in the RN app:

```bash
npx expo install @sentry/react-native
```

### 8.2 Backend Logging

Monitor Docker logs:

```bash
docker compose logs -f web
```

### 8.3 Uptime Monitoring

Use a free service like UptimeRobot or Better Uptime to monitor `https://api.simplyrenit.com/api/`.

### 8.4 Cloudflare Dashboard

Monitor tunnel health and traffic at https://one.dash.cloudflare.com.

---

## 9. Checklist

### Security

- [ ] Rotate any AWS credentials that were shared or exposed
- [ ] Generate a new strong Django secret key for production
- [ ] Use a strong database password
- [ ] Ensure no secrets are hardcoded in source code
- [ ] Verify HTTPS is working on the API domain
- [ ] Review Firebase security rules

### Backend

- [ ] Docker Compose running with production `.env`
- [ ] Database migrations applied
- [ ] Cloudflare Tunnel running and verified
- [ ] Cloudflared set up as a systemd service (auto-restart)
- [ ] API accessible at `https://api.simplyrenit.com`
- [ ] WebSocket (chat) working through the tunnel

### AWS

- [ ] S3 bucket created with correct permissions
- [ ] CORS configured on the bucket
- [ ] Presigned URL uploads verified
- [ ] Image serving working (CloudFront or direct S3)

### App

- [ ] `DEV_MODE` set to `"PROD"` in `config.ts`
- [ ] `app.json` has correct bundle identifiers and version
- [ ] `eas.json` configured with preview and production profiles
- [ ] Google Services file (`google-services.json`) present for Android
- [ ] Push notifications configured (FCM + APNs)
- [ ] Android APK built and tested
- [ ] iOS build submitted to TestFlight

### Testing (before sharing with users)

- [ ] User registration / login flow works
- [ ] Google Sign-In works
- [ ] Product posting with images works
- [ ] Product browsing and search works
- [ ] Chat / messaging works (WebSocket through tunnel)
- [ ] Push notifications received
- [ ] Favorites / saved products works
- [ ] Profile editing works
- [ ] Location / maps working

### Machine (since backend runs locally)

- [ ] Machine set to never sleep / auto-suspend disabled
- [ ] Docker set to start on boot (`sudo systemctl enable docker`)
- [ ] Cloudflared service enabled on boot
- [ ] Stable internet connection
- [ ] UPS / power backup (optional but recommended)
