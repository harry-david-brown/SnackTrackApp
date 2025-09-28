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

### 🔄 **Next Development Priorities**
- [ ] **Analytics Charts** - Spending visualizations and trend analysis
- [ ] **Social Sharing** - Shareable summaries and viral features
- [ ] **Advanced Error Handling** - Comprehensive loading states and error management
- [ ] **Offline Support** - Data persistence and offline functionality

### 📅 **Future Enhancements**
- [ ] **Performance Optimization** - Bundle size and loading improvements
- [ ] **Advanced Analytics** - Machine learning insights and predictions
- [ ] **User Onboarding** - Guided tour and feature discovery
- [ ] **A/B Testing** - Feature experimentation and optimization

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

**That's it!** The app is now running with real data from your API

## 🗄️ Development Environment

### **API Dependency**
- **Required**: Snack Track API must be running on `http://localhost:3000`
- **Without API**: App falls back to mock data for development
- **With API**: Shows real spending analytics from your database

### **Environment Setup**
- **Docker**: PostgreSQL + Redis containers for development
- **Ports**: App (8082), PostgreSQL (5433), Redis (6380)
- **Hot Reload**: Automatic refresh on file changes

### **API Connection Behavior**
- ✅ **API Running**: Real data from your Snack Track database
- 🔄 **API Down**: Automatic fallback to mock data for continued development
- 🚨 **Connection Issues**: Clear error messages and graceful degradation

### **What Happens Without the API**
If the Snack Track API is not running on `localhost:3000`:
- **Authentication**: Uses mock user creation (any email works)
- **Dashboard**: Shows sample data with realistic spending numbers
- **CSV Upload**: Simulates successful upload with mock data
- **Development**: You can still build and test UI components
- **Console**: Clear messages indicating fallback to mock data

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
npm run android       # Run on Android emulator
npm run ios           # Run on iOS simulator
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
