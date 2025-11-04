# 📱 Snack Track App

A React Native/Expo app that connects to the Snack Track API to automatically track your food spending through **Uber CSV imports** and provides beautiful analytics and social sharing features.

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

---

### 📅 **Future Enhancements**
- [ ] **Forgot Password** - Password reset flow (backend support pending)
- [ ] **Email Verification** - Verify user emails on registration
- [ ] **Social Login** - Google and Apple Sign In
- [ ] **Biometric Auth** - Face ID / Touch ID support
- [ ] **Multi-Template Sharing** - Additional Wrapped-style slide variations
- [ ] **Currency Auto-Detection** - Detect CAD/USD/EUR from CSV or locale
- [ ] **Receipt List View** - Browse individual transactions
- [ ] **Performance Optimization** - Bundle size and loading improvements

### ⚠️ **Known Issues**
- [ ] **Redis Cache Stale Data** - After uploading a new CSV file, the Wrapped journey and dashboard may show stale cached data from Redis instead of the newly uploaded data. This appears to be a backend caching issue where Redis cache is not being properly invalidated after CSV uploads. Workaround: User may need to wait a few minutes or manually refresh after uploading new data.

---

## 🔐 Authentication & Security

### JWT-Based Authentication
This app uses **secure JWT authentication** with the backend API:

- **Registration:** Email + password (8+ chars, 1 uppercase, 1 number)
- **Login:** Email + password authentication
- **Token Management:** Automatic refresh every 15 minutes
- **Session Persistence:** Secure token storage in AsyncStorage
- **Auto-Logout:** Expired sessions redirect to login

### Quick Auth Flow
1. **First-time users:** Sign up with email and password
2. **Returning users:** Sign in (tokens stored securely)
3. **Upload data:** CSV or ZIP files
4. **View analytics:** Spending insights and trends
5. **Share:** Spotify Wrapped-style viral journey

📚 **Full documentation:** See `AUTHENTICATION_IMPLEMENTATION.md` for complete details

---

## 🚀 Quick Start

**Prerequisites:** Node.js 20+ (LTS recommended), Docker, Git

1. **Clone and setup**
   ```bash
   git clone https://github.com/harry-david-brown/SnackTrackApp.git
   cd SnackTrackApp
   npm run setup
   ```
   
   **Windows users:** Open Command Prompt or PowerShell, navigate to the project folder, then run:
   ```bash
   scripts\setup.bat
   ```

2. **Start the Snack Track API** (required for real data)
   ```bash
   # In a separate terminal, start the API project
   cd path/to/SnackTrackAPI
   docker-compose up --build -d
   ```

3. **Start the app**
   ```bash
   npm start
   # Press 'w' to open in browser
   ```

## 🗄️ Development Environment

### **API Dependency**
- **Required**: Snack Track API must be running and accessible
- **Development**: Configure API URL in `.env` file (see below)
- **Production**: Set `EXPO_PUBLIC_API_URL` environment variable
- **Critical**: CSV uploads and write operations require real API (no mock fallbacks)
- 📖 **See [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) for complete configuration guide**

### **Environment Setup**
- **Docker**: PostgreSQL + Redis containers for development
- **Ports**: App (8082), PostgreSQL (5433), Redis (6380)
- **Hot Reload**: Automatic refresh on file changes

### **API Connection Behavior**
- ✅ **API Running**: Real data from your Snack Track database
- ⚠️ **API Down (Development)**: Limited mock data for UI testing only
- 🚨 **API Down (Production)**: Shows error messages, no silent fallbacks
- 🔒 **Critical Operations**: CSV uploads always require real API connection

### **Development Without API** *(Development Mode Only)*
If the Snack Track API is not accessible:
- **Authentication**: Mock login allowed for UI testing
- **Dashboard**: May show sample data with realistic numbers
- **CSV Upload**: ❌ **REQUIRES REAL API** - Will show error if API unavailable
- **Development**: Can test UI components with mock data
- **Console**: Clear warnings about using mock fallbacks
- **Production**: ⚠️ Mock fallbacks are **completely disabled**

## 📱 Mobile Testing

### **Quick Start**
1. **Install Expo Go** on your mobile device
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Start development server**
   ```bash
   npx expo start
   ```

3. **Open in Expo Go** and start testing!

### **API Connection for Mobile**
For mobile devices to connect to your local API:

1. Find your computer's IP address:
   ```bash
   ip addr show  # Linux
   ifconfig      # Mac
   ```

2. Create `.env.local`:
   ```bash
   EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:3000
   ```

3. Restart Expo to apply changes

### **Benefits**
- ✅ No complex setup required
- ✅ Works on iOS and Android
- ✅ Instant hot reload
- ✅ Test native features (camera, sharing, etc.)



## 📊 API Integration

**Base URL:** `http://localhost:3000` (your Snack Track API)

### **Connected Endpoints**
- `GET /database/users` - Real user data
- `GET /validation/user/{userId}/summary` - Analytics data
- `GET /users/{userId}/totalSpent` - Spending totals
- `POST /users/create` - User creation (with fallback)

### **Real Data Display**
- **Total Spent**: Shows actual spending from database
- **Receipt Count**: Displays real receipt numbers
- **Top Restaurants**: Real restaurant rankings with spending
- **Monthly Breakdown**: Actual spending trends

## 🛠️ Development Commands

### **App Development**
```bash
npm start              # Start Expo development server
npm run start:clean    # Clean start (kills existing processes)
npm run web           # Open in web browser
npx expo start        # Start for mobile testing (Expo Go)
npm run stop-expo     # Stop all Expo/Metro processes
```

### **Database Management**
```bash
npm run db:start      # Start PostgreSQL + Redis
npm run db:stop       # Stop database containers
npm run db:reset      # Reset database (removes all data)
npm run db:logs       # View database logs
```

### **Code Quality**
```bash
npm run lint          # Run ESLint
npm run type-check    # Run TypeScript compiler check
npm test             # Run tests
npm run ci           # Run all CI checks locally (type-check + lint + test)
npm run verify       # Verify setup and environment
npm run clean        # Clean install dependencies
```

### **Pre-Commit Hooks**
Pre-commit hooks automatically run `type-check` and `lint` before each commit to catch errors early.

**To skip** (not recommended):
```bash
git commit --no-verify
```

## 📁 Project Structure

```
📱 Snack Track App/
├── 🏠 app/                   # Expo Router pages
│   ├── (tabs)/               # Tab navigation screens
│   │   ├── index.tsx         # Dashboard with real data
│   │   ├── upload.tsx        # CSV Upload functionality
│   │   ├── analytics.tsx     # Analytics & Charts (next)
│   │   └── profile.tsx       # User Profile
│   ├── _layout.tsx           # Root layout with providers
│   └── index.tsx             # Authentication flow
│
├── 🔧 components/            # Reusable components
│   ├── LoginScreen.tsx       # Authentication UI
│   ├── UberDataUpload.tsx    # ZIP file upload component
│   ├── WrappedShareJourney.tsx # Spotify-style analytics journey
│   └── WrappedJourneyLoader.tsx # Processing screen with animations
│
├── 🎣 contexts/              # React Context providers
│   └── UserContext.tsx       # User state management
│
├── 🌐 services/              # API services
│   ├── api.ts                # Real API client
│   ├── mockApi.ts            # Mock API fallback
│   └── analyticsApi.ts       # Analytics API integration
│
├── 📊 types/                 # TypeScript definitions
│   └── api.ts                # API response types
│
├── 🐳 docker/                # Docker configuration
│   └── postgres/
│       └── init.sql          # Database initialization
│
├── 📜 scripts/               # Development scripts
│   ├── setup.sh              # Automated environment setup
│   └── verify-setup.js       # Environment verification
│
└── 📄 Configuration files    # Package.json, Docker, etc.
```

## 🔄 CI/CD Pipeline

**Status:** ✅ Automated quality checks on every push

### **Active Checks**
- ✅ TypeScript type checking (`npm run type-check`)
- ✅ ESLint linting (`npm run lint`)
- ✅ Unit tests with coverage (`npm test`)
- ✅ Security audit (`npm audit`)
- ✅ Code coverage tracking (Codecov)

### **Quick Wins Implemented**
- ✅ Concurrency control (cancels outdated runs)
- ✅ Job timeouts (prevents stuck pipelines)
- ✅ Pre-commit hooks (Husky - auto-runs type-check & lint)
- ✅ Local CI script (`npm run ci`)

### **Run Checks Locally**
```bash
npm run ci  # Runs all CI/CD checks before pushing
```

### **Production Enhancements (Before Launch)**
- [ ] Enable branch protection (require PR reviews)
- [ ] Add CodeQL security scanning
- [ ] Set up deployment workflows (staging/production)
- [ ] Add E2E testing with Detox
- [ ] Bundle size monitoring
- [ ] Performance benchmarking

---

## 🤝 Contributing

### **For the contributing guide read CONTRIBUTING.md**