# 📱 Snack Track App

A React Native/Expo app that automatically tracks your food spending through **Uber CSV imports** and provides beautiful analytics and social sharing features.

## 📋 Project Progress

### ✅ **Core MVP Features** - Production-ready frontend
- [x] **Development Environment** - Complete Docker, Git, and documentation setup
- [x] **JWT Authentication** - Password-based login/register with automatic token refresh
- [x] **CSV & ZIP Upload** - Support for both CSV and ZIP files (auto-extract)
- [x] **Dashboard Integration** - Real data display with live API connection
- [x] **API Integration** - Full backend integration with auth headers
- [x] **Professional UI** - Beautiful, responsive design with NativeWind styling
- [x] **Team Onboarding** - Complete documentation for seamless collaboration

### 🔄 **Recent Additions** (October 2025)
- [x] **JWT Authentication System** - Secure password-based auth with token management
- [x] **Automatic Token Refresh** - Seamless 15-minute token refresh in background
- [x] **ZIP File Upload** - Full support for Uber data export ZIP files
- [x] **Authorization Headers** - Automatic injection for all protected API calls
- [x] **Session Management** - Persistent login with secure token storage
- [x] **Password Validation** - Real-time validation with user feedback
- [x] **Error Handling** - 401/403 handling with auto-logout on session expiry
- [x] **Error Handling Improvements** - Silent error handling, no console spam
- [x] **Performance Optimization** - Fixed duplicate API calls on refresh and login
- [x] **Analytics Charts** - Spending visualizations and trend analysis
- [x] **Advanced Error Handling** - Comprehensive loading states and error management
- [x] **Network Monitoring** - Real-time connection status and offline detection
- [x] **Social Sharing** - Spotify Wrapped-style viral journey with native share sheet
- [x] **Offline Support** - Analytics caching and offline viewing (15min TTL)
- [x] **User Onboarding** - 4-slide tutorial with viral messaging
- [x] **Uber Data Tutorial** - Step-by-step ZIP upload guide
- [x] **Animations** - Smooth transitions and swipeable content
- [x] **Spotify Wrapped-Style Journey** - 13 analytics categories with dynamic slide generation
- [x] **Wrapped Analytics API** - Backend support for comprehensive analytics insights
- [x] **Visual Design Enhancements** - Premium gradients, shadows, and responsive typography
- [x] **Loading State Improvements** - Eliminated $0 flash and progress bar delays
- [x] **Processing Screen Polish** - Enhanced visual design with professional styling
- [x] **API Call Optimization** - Reduced redundant calls by 75-80% in typical sessions
- [x] **Global Analytics State** - Shared analytics across all screens for better performance
- [x] **ZIP-First UX** - Renamed CSVUpload to UberDataUpload for clarity
- [x] **Cross-Device Compatibility** - Responsive safe zones and type scales
- [x] **Instagram Stories Optimization** - Watermark positioning for optimal sharing
- [x] **Email Verification & Password Reset** - OTP-based verification flows with secure password recovery UX

---

### 📅 **Future Enhancements**
- [x] **Forgot Password** - Password reset flow (shipped with OTP UX)
- [x] **Email Verification** - Verify user emails on registration
- [ ] **Social Login** - Google and Apple Sign In
- [ ] **Biometric Auth** - Face ID / Touch ID support
- [ ] **Multi-Template Sharing** - Additional Wrapped-style slide variations
- [ ] **Currency Auto-Detection** - Detect CAD/USD/EUR from CSV or locale
- [ ] **Receipt List View** - Browse individual transactions
- [ ] **Performance Optimization** - Bundle size and loading improvements

### ⚠️ **Known Issues**
- [ ] **Redis Cache Stale Data** - After uploading a new CSV file, the Wrapped journey and dashboard may show stale cached data from Redis instead of the newly uploaded data. This appears to be a backend caching issue where Redis cache is not being properly invalidated after CSV uploads. Workaround: User may need to wait a few minutes or manually refresh after uploading new data.

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
   - ✅ Start development databases
   
   **Windows users:** Run `scripts\setup.bat` instead

2. **Configure API URL** (optional)
   
   The setup script creates a `.env` file with Railway production API as default. You can update it if needed:
   ```bash
   # .env (defaults to Railway production)
   EXPO_PUBLIC_API_URL=https://snacktrackapi-production.up.railway.app
   EXPO_PUBLIC_APP_ENV=development
   ```
   
   **Default:** `EXPO_PUBLIC_API_URL` defaults to Railway production API
   - **Default**: `https://snacktrackapi-production.up.railway.app` (Railway production)
   - **Local dev**: `http://localhost:3000` (if running backend locally)
   - **Mobile testing**: `http://YOUR_IP:3000` (use your computer's IP for local backend)
   
   > ℹ️ **The app defaults to Railway production API. Set `EXPO_PUBLIC_API_URL` only if you need a different API.**

3. **Start the backend API** (in a separate terminal)
   ```bash
   cd path/to/SnackTrackAPI
   docker-compose up --build -d
   ```

4. **Start the app**
   ```bash
   npm start
   # Press 'w' to open in browser
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
- Ensure the backend API is running (`docker-compose up -d`)
- For mobile testing, use your computer's IP address instead of `localhost`

**Need help?**
- Check the [Development Guide](#-development-guide) below
- Run `npm run verify` for setup diagnostics

---

## 🛠️ Development Guide

### Environment Variables

**Optional (with defaults):**
- `EXPO_PUBLIC_API_URL` - API base URL, defaults to `https://snacktrackapi-production.up.railway.app` (Railway production)
- `EXPO_PUBLIC_APP_ENV` - Environment type (`development`, `staging`, `production`), defaults to `development`

The `npm run setup` script creates a `.env` file automatically with Railway production API as default. Edit it to customize your configuration (e.g., for local development).

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
│   └── useOfflineSync.ts     # Offline sync
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
- **Production Guide**: [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) (coming soon)

---

**Questions?** Run `npm run verify` to diagnose setup issues, or check the troubleshooting section above.
