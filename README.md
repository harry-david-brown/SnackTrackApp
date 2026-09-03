# 📱 Snack Track App

A native iOS and Android React Native/Expo app that shows you how much you wasted on food delivery through **Uber CSV imports**, then roasts you. Browser builds are not supported.

### 📅 **Future Enhancements**
- [x] **Forgot Password** - Password reset flow (shipped with OTP UX)
- [x] **Email Verification** - Verify user emails on registration
- [x] **Social Login** - Google and Apple Sign In
- [ ] **Biometric Auth** - Face ID / Touch ID support
- [ ] **Multi-Template Sharing** - Additional Wrapped-style slide variations
- [X] **Currency Auto-Detection** - Detect CAD/USD/EUR from CSV or locale
- [x] **Receipt List View** - Browse individual transactions
- [ ] **Performance Optimization** - Bundle size and loading improvements

---

## 🚀 Getting Started (New Developers)

### Prerequisites
- **Node.js** 20+ (LTS recommended)
- **Docker** Desktop
- **Git**

### Quick Setup (5 minutes)

1. **Clone and setup**
   ```bash
   git clone https://github.com/harry-david-brown/SnackTrackApp.git
   cd SnackTrackApp
   npm run setup
   ```
   
   The setup script will:
   - ✅ Check system requirements
   - ✅ Install dependencies
   - ✅ Create `.env` file with default configuration
   - ✅ Start PostgreSQL, Redis, MinIO, migrations, the API, and an import worker
   
   **Windows users:** Run `scripts\setup.bat` instead

2. **Configure API URL** (optional)
   
   The setup script creates a `.env` file for the local API. Update it when testing a remote environment or physical device:
   ```bash
   # .env (local default)
   EXPO_PUBLIC_API_URL=http://localhost:3000
   EXPO_PUBLIC_APP_ENV=development
   ```
   
   - **Local dev**: `http://localhost:3000`
   - **Railway**: set the deployed API's HTTPS URL explicitly
   - **Mobile testing**: `http://YOUR_IP:3000` (use your computer's IP for local backend)
   
   > The app fails fast when `EXPO_PUBLIC_API_URL` is absent; it never silently connects a development build to production.

3. **Start the backend API** (in a separate terminal)
   ```bash
   npm run backend:start
   ```

4. **Start the app**
   ```bash
   npm start
   # Press 'i' for iOS or 'a' for Android
   ```

5. **Verify setup**
   ```bash
   npm run verify
   ```

### Troubleshooting

**App won't start?**
- Check that `EXPO_PUBLIC_API_URL` is set in `.env`
- Run `npm run verify` to check all requirements

**Can't connect to API?**
- Ensure the complete backend is running (`npm run backend:start`)
- For mobile testing, use your computer's IP address instead of `localhost`

**Need help?**
- Check the [Development Guide](#-development-guide) below
- Run `npm run verify` for setup diagnostics

---

## 🛠️ Development Guide

### Environment Variables

**Configuration:**
- `EXPO_PUBLIC_API_URL` - required API base URL; `.env.example` uses `http://localhost:3000`
- `EXPO_PUBLIC_APP_ENV` - Environment type (`development`, `staging`, `production`), defaults to `development`
- `EXPO_PUBLIC_SENTRY_DSN` - Sentry DSN for error tracking (optional - app works without it)

The `npm run setup` script creates a local `.env` automatically. Deployment environments must set their API URL explicitly.

**Error Tracking (Sentry):**
- Sentry is integrated for production error tracking and crash reporting
- Set `EXPO_PUBLIC_SENTRY_DSN` in your environment to enable (get DSN from https://sentry.io)
- App works normally without Sentry configured (errors are logged to console in development)

### Development Commands

```bash
# App Development
npm start              # Start Expo dev server
npm run start:clean    # Clean start (kills existing processes)
npm run stop-expo     # Stop all Expo/Metro processes

# Code Quality
npm run lint          # Run ESLint
npm run type-check    # TypeScript type checking
npm test             # Run tests
npm run ci           # Run all CI checks (type-check + lint + test)
npm run verify       # Verify setup and environment
```

### Mobile Testing

1. **Install Expo Go** on your device
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Start the dev server**
   ```bash
   npx expo start
   ```

3. **Open Expo Go** the development server should show up automatically. Or scan the QR code in your terminal

**For mobile to connect to local API:**
- Find your computer's IP: `ip addr show` (Linux) or `ifconfig` (Mac)
- Update `.env`: `EXPO_PUBLIC_API_URL=http://YOUR_IP:3000` (overrides Railway default)
- Restart Expo

### Manual Testing

For comprehensive manual testing of network/offline features, error handling, and file uploads:
- **[Manual Testing Guide](./docs/MANUAL_TESTING.md)** - Complete testing scenarios, checklists, and tools

---

## 📁 Project Structure

```
📱 Snack Track App/
├── 🏠 app/                   # Expo Router pages
│   ├── (tabs)/               # Tab navigation screens
│   │   ├── index.tsx         # Dashboard
│   │   ├── upload.tsx        # CSV/ZIP Upload
│   │   ├── wrapped-journey.tsx # Analytics journey
│   │   └── profile.tsx        # User Profile
│   ├── _layout.tsx           # Root layout
│   └── index.tsx             # Authentication
│
├── 🔧 components/            # Reusable components
│   ├── LoginScreen.tsx       # Authentication UI
│   ├── PasswordResetModal.tsx # Password reset flow
│   ├── EmailVerificationModal.tsx # Email verification
│   ├── UberDataUpload.tsx    # File upload
│   ├── WrappedShareJourney.tsx # Analytics journey
│   └── [Other components]   # Charts, sharing, etc.
│
├── 🎣 contexts/              # React Context
│   ├── UserContext.tsx       # User state & auth
│   └── OnboardingContext.tsx # Onboarding state
│
├── 🌐 services/              # API services
│   ├── api.ts                # API client
│   ├── authApi.ts            # Authentication
│   └── analyticsApi.ts       # Analytics
│
├── 🪝 hooks/                 # Custom hooks
│   ├── useNetworkStatus.ts   # Network monitoring
│
├── 🛠️ utils/                 # Utilities
│   ├── tokenManager.ts       # Token storage (SecureStore)
│   └── offlineCache.ts       # Analytics caching
│
├── 📊 types/                 # TypeScript types
│   └── api.ts                # API types
│
├── 📜 scripts/               # Development scripts
│   ├── setup.sh              # Automated setup
│   └── verify-setup.js       # Environment verification
│
└── 📄 Configuration          # Package.json, Docker, etc.
```

---

## 🔐 Authentication & Security

### JWT Authentication
- **Registration/Login**: Email + password (8+ chars, 1 uppercase, 1 number)
- **Token Management**: Automatic refresh every 15 minutes
- **Secure Storage**: Tokens stored in encrypted Keychain/Keystore (Expo SecureStore)
- **Session Management**: Persistent login with auto-logout on expiry

### Password Reset & Email Verification
- **Password Reset**: 4-step OTP flow (request → verify → reset → success)
- **Email Verification**: Optional OTP-based verification (non-blocking)
- **Rate Limiting**: Built-in protection against abuse

---

## 🔄 CI/CD Pipeline

**Status:** ✅ Automated quality checks on every push

### Active Checks
- ✅ TypeScript type checking
- ✅ ESLint linting
- ✅ Unit tests
- ✅ Security audit

### Pre-Commit Hooks
Automatically runs `type-check` and `lint` before each commit.

**Run checks locally:**
```bash
npm run ci  # Runs all CI checks
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

---

## 📚 Additional Resources

- **Launch Checklist**: [LAUNCH_TODO.md](./LAUNCH_TODO.md)
- **Backend Integration**: See backend project documentation

---

**Questions?** Run `npm run verify` to diagnose setup issues, or check the troubleshooting section above.
