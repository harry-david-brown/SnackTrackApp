# 🚀 Snack Track App - Development Guide

**Quick start guide for developers joining the Snack Track team**

## 📋 Prerequisites

Before you start, make sure you have these installed:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Docker & Docker Compose** - [Download here](https://docker.com/)
- **Git** - [Download here](https://git-scm.com/)
- **Expo CLI** - Will be installed automatically by setup script

## 🏃‍♂️ Quick Start (5 minutes)

1. **Clone the repository**
   ```bash
   git clone https://github.com/harry-david-brown/SnackTrackApp.git
   cd SnackTrackApp
   ```

2. **Run the setup script**
   ```bash
   npm run setup
   ```
   This will:
   - Check all requirements
   - Install dependencies
   - Set up environment files
   - Start the development database
   - Verify everything works

3. **Start the app**
   ```bash
   npm start
   ```

4. **Open on your device**
   - Install Expo Go app on your phone
   - Scan the QR code from terminal
   - Or press `i` for iOS simulator, `a` for Android emulator

## 🛠️ Development Commands

### App Development
```bash
npm start              # Start Expo development server
npm run android        # Run on Android
npm run ios           # Run on iOS (macOS only)
npm run web           # Run on web browser
npm run dev           # Start with dev client
```

### Database Management
```bash
npm run db:start      # Start PostgreSQL + Redis
npm run db:stop       # Stop database containers
npm run db:reset      # Reset database (removes all data)
npm run db:logs       # View database logs
```

### Code Quality
```bash
npm run lint          # Run ESLint
npm run type-check    # Run TypeScript compiler check
npm test             # Run tests
npm run doctor       # Check Expo setup
```

### Maintenance
```bash
npm run clean        # Clean install dependencies
```

## 🏗️ Project Structure

```
📱 Snack Track App/
├── 🏠 app/                    # Expo Router pages
│   ├── (tabs)/               # Tab navigation screens
│   │   ├── index.tsx         # Dashboard
│   │   ├── upload.tsx        # CSV Upload
│   │   ├── analytics.tsx     # Analytics & Charts
│   │   └── profile.tsx       # User Profile
│   └── _layout.tsx           # Root layout
├── 🔧 components/            # Reusable components
├── 🎣 hooks/                 # Custom React hooks
├── 🌐 services/              # API services
│   └── api.ts               # API client
├── 📊 types/                 # TypeScript definitions
│   └── api.ts               # API types
├── 🛠️ utils/                 # Utility functions
├── 🐳 docker/               # Docker configuration
├── 📜 scripts/              # Development scripts
└── 📄 Configuration files
```

## 🔌 API Integration

The app connects to a backend API running on `localhost:3000`. 

### Available Endpoints
- `POST /users/create` - Create user
- `GET /users/:id/totalSpent` - Get spending total
- `POST /csv/import` - Import CSV file
- `GET /validation/user/:id/summary` - Get user insights

### API Configuration
Edit `.env` file to change API settings:
```env
API_BASE_URL=http://localhost:3000
```

## 🗄️ Database

Development uses Docker containers:
- **PostgreSQL**: `localhost:5432`
  - Database: `snacktrack`
  - User: `snacktrack`
  - Password: `password`
- **Redis**: `localhost:6379`

### Database Schema
```sql
-- Users table
users (id, email, created_at, updated_at)

-- Receipts table  
receipts (id, user_id, restaurant_name, order_date, amount_spent, items, data_source, created_at, updated_at)
```

## 🎨 Styling & UI

- **Styling**: NativeWind (Tailwind for React Native)
- **Icons**: Expo Vector Icons (Ionicons)
- **Charts**: React Native Chart Kit
- **Navigation**: Expo Router

## 🧪 Testing

```bash
npm test              # Run all tests
npm test -- --watch  # Run tests in watch mode
npm test -- --coverage # Run with coverage
```

## 🚀 Deployment

### Development Build
```bash
npm run build:android  # Build Android APK
npm run build:ios     # Build iOS app
```

### Production Deployment
- Use EAS Build for production builds
- Configure in `app.json` under `extra.eas`

## 🐛 Troubleshooting

### Common Issues

**"Metro bundler not starting"**
```bash
npm run clean
npm install
npm start
```

**"Database connection failed"**
```bash
npm run db:reset
```

**"Expo CLI not found"**
```bash
npm install -g @expo/cli
```

**"Android emulator not found"**
- Install Android Studio
- Create a virtual device in AVD Manager

**"iOS simulator not working (macOS)"**
```bash
sudo xcode-select --install
```

### Getting Help

1. Check the [Expo Documentation](https://docs.expo.dev/)
2. Look at existing issues in the GitHub repo
3. Ask in the team chat
4. Create a new issue with:
   - Your OS and Node.js version
   - Complete error message
   - Steps to reproduce

## 📱 Device Testing

### Physical Device
1. Install Expo Go from App Store/Play Store
2. Scan QR code from terminal
3. App will load on your device

### Simulator/Emulator
- **iOS**: Press `i` in terminal (macOS only)
- **Android**: Press `a` in terminal (requires Android Studio)

## 🔄 Git Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

3. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Convention
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance

## 🎯 Development Priorities

### Phase 1: Core Functionality
- [ ] User authentication
- [ ] CSV upload flow
- [ ] Dashboard data integration
- [ ] Basic analytics

### Phase 2: Enhanced Features
- [ ] Advanced charts
- [ ] Social sharing
- [ ] Push notifications
- [ ] Offline support

### Phase 3: Polish & Scale
- [ ] Performance optimization
- [ ] Advanced analytics
- [ ] User onboarding
- [ ] A/B testing

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

- **Team Lead**: Harry David Brown
- **Repository**: https://github.com/harry-david-brown/SnackTrackApp
- **Issues**: Use GitHub Issues for bugs and feature requests

---

**Happy coding! 🍕🚀**
