# 📱 Snack Track App

A React Native/Expo app that connects to the Snack Track API to automatically track your food spending through **Uber CSV imports** and provides beautiful analytics and social sharing features.

## 📋 Project Progress

### ✅ **Core MVP Features** - Production-ready frontend
- [x] **Development Environment** - Complete Docker, Git, and documentation setup
- [x] **User Authentication** - Email-based login with persistent state management
- [x] **CSV Upload Flow** - File picker with upload progress and real API integration
- [x] **Dashboard Integration** - Real data display with live API connection
- [x] **API Integration** - Connected to backend with fallback to mock data
- [x] **Professional UI** - Beautiful, responsive design with NativeWind styling
- [x] **Team Onboarding** - Complete documentation for seamless collaboration

### 🔄 **Recent Additions**
- [x] **Analytics Charts** - Spending visualizations and trend analysis
- [x] **Advanced Error Handling** - Comprehensive loading states and error management
- [x] **Network Monitoring** - Real-time connection status and offline detection
- [x] **Error Testing** - Stress testing utilities and comprehensive error scenarios

### 📅 **Future Enhancements**
- [ ] **Social Sharing** - Shareable summaries and viral features
- [ ] **Offline Support** - Data persistence and offline functionality
- [ ] **Performance Optimization** - Bundle size and loading improvements
- [ ] **Advanced Analytics** - Machine learning insights and predictions
- [ ] **User Onboarding** - Guided tour and feature discovery

---

## 🎯 Production Readiness

### 🟡 **MVP Launch (Target: ~1,000 Users)**
Ready for small-scale production deployment. See [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) for complete checklist.

**Critical Requirements:**
- [ ] Authentication & authorization (JWT/OAuth)
- [ ] Rate limiting (per-user & global)
- [ ] Error tracking (Sentry integration)
- [ ] Performance monitoring (APM)
- [ ] Database indexes and optimization
- [ ] Async CSV processing with job queue
- [ ] Security audit and input validation
- [ ] Privacy policy and app store submission
- [ ] Staging environment testing
- [ ] Load testing (100+ concurrent users)

**Timeline:** 2-3 weeks of focused development

### 🔴 **Scale Ready (Target: 10,000+ Users)**
Production-grade infrastructure for high-traffic launch.

**Infrastructure Requirements:**
- [ ] Horizontal scaling (load balancer + multiple API instances)
- [ ] Redis caching layer for performance
- [ ] CDN for static assets
- [ ] Database read replicas
- [ ] Message queue for background processing
- [ ] Advanced monitoring & alerting
- [ ] Security hardening (penetration testing)
- [ ] Disaster recovery plan
- [ ] 24/7 on-call rotation
- [ ] Auto-scaling configuration

**Timeline:** 4-6 weeks after MVP launch


🔴 **P0 Blockers:**
1. No authentication system
2. No authorization/ownership validation
3. No error tracking - Sentry
4. No APM/monitoring (2-3 days)

🟡 **P1 Critical:**
5. Database optimization needed
6. Redis caching missing
7. Structured logging incomplete
8. API key enforcement weak
9. Input validation gaps
10. No database backups

---

## 🚀 Quick Start

**Prerequisites:** Node.js 18+, Docker, Git

1. **Clone and setup**
   ```bash
   git clone https://github.com/harry-david-brown/SnackTrackApp.git
   cd SnackTrackApp
   npm run setup
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

## 📱 Mobile Development

### **Testing on Physical Device**
Test the app on your phone using Expo Go:

1. **Install Expo Go** app on your phone
2. **Start development server**: `npm run mobile`
3. **Scan QR code** with your phone's camera
4. **Select "Snack Track"** in Expo Go app

**Note**: For mobile testing with API connectivity, you may need to:
1. **Find your computer's IP address**: `ip addr show` (Linux) or `ifconfig` (Mac)
2. **Create `.env.local`** with your IP:
   ```
   EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:3000
   ```
3. **Restart Expo** to pick up the new environment variable

### **Mobile Testing (Expo Go)**
Test the app on any mobile device using Expo Go:

1. **Install Expo Go**: Download from [App Store](https://apps.apple.com/app/expo-go/id982107779) (iOS) or [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent) (Android)
2. **Start Expo**: `npx expo start`
3. **Scan QR code** with your camera or Expo Go app
4. **Select "Snack Track"** in the Expo Go app

**Simple command:**
- `npx expo start` - Start Expo development server

**Benefits**: 
- **No setup required**: Works on any iOS or Android device
- **Instant testing**: Changes appear immediately on your device
- **Cross-platform**: Test on both iOS and Android with one command

### **Mobile Features**
- **Native Sharing**: Test social sharing functionality
- **Touch Interactions**: Verify gestures and animations
- **Device APIs**: Test camera, file system, and media library
- **Cross-Platform**: Works on iOS and Android devices via Expo Go

## 🎭 Current Features

### **Dashboard** - Real spending analytics
- Total spending display with live API data
- Top restaurants with real rankings
- Recent activity and spending trends
- Pull-to-refresh for updated data

### **CSV Upload** - File import simulation
- Document picker for CSV files
- Upload progress and status display
- Integration with real API data
- Success/error feedback

### **Authentication** - Seamless login
- Email-based user creation
- Persistent login state
- Automatic data loading
- Professional login screen

### **Profile** - User management
- User information display
- Account statistics
- Settings and preferences
- Logout functionality

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
npm run verify       # Verify setup and environment
npm run clean        # Clean install dependencies
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
│   └── CSVUpload.tsx         # File upload component
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

## 🤝 Contributing

### **Quick Start for Contributors**

1. **Fork and clone**
   ```bash
   git clone https://github.com/harry-david-brown/SnackTrackApp.git
   cd SnackTrackApp
   ```

2. **Set up environment**
```bash
   npm run setup
   ```

3. **Start development**
   ```bash
   npm start
   # Press 'w' to open in browser
   ```

4. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. **Make changes and test**
   ```bash
   npm run verify    # Verify everything still works
   npm test          # Run tests
   ```

6. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

7. **Create pull request** on GitHub

### **Development Tips**
- **Hot Reload**: Changes automatically refresh the app
- **Real Data**: Always test with actual API data
- **Branch Names**: Use descriptive names like `add-analytics-charts`
- **Commit Messages**: Be clear about what you changed
