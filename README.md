# Snack Track App 🍕

**A viral food tracking mobile app built with Expo + React Native + TypeScript**

## 🎯 Project Overview

Snack Track is a **lightweight, streamlined, production-ready** food tracking app designed to go viral with a "Spotify Wrapped" style experience. The app focuses on **simplicity and clarity** over complex features.

### 🚀 Core Philosophy
- **Lightweight & Streamlined**: Single-focus components, minimal complexity
- **Mobile-First**: Designed for social sharing and viral growth
- **Production-Ready**: Built for scale and reliability
- **Viral Strategy**: Spotify Wrapped-style summaries and native social sharing

## 🏗️ Architecture

### Frontend (This Project)
- **Framework**: Expo (React Native + TypeScript)
- **Navigation**: Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind for React Native)
- **Charts**: React Native Chart Kit + SVG
- **State**: React Context + useReducer
- **API**: React Query + Axios
- **Storage**: AsyncStorage + Expo FileSystem

### Backend (snack-track-api)
- **API**: Express.js + TypeScript
- **Database**: PostgreSQL
- **Security**: Rate limiting, Helmet.js, CORS
- **Documentation**: Swagger/OpenAPI
- **Error Handling**: Centralized middleware with custom error classes

## 📱 App Structure

```
📱 4-Tab Mobile App:
├── 🏠 Dashboard - Spending overview, recent receipts
├── 📤 Upload - CSV file picker and import flow  
├── 📊 Analytics - Charts, trends, shareable insights
└── 👤 Profile - User settings, account management
```

## 🔌 API Integration

### Base URL
```
http://localhost:3000
```

### Essential Endpoints

#### Users
- `POST /users/create` - Create user with email
- `GET /users/:id/totalSpent` - Get total spending
- `POST /users/:id/update-receipts` - Trigger email parsing
- `GET /users/:id/debug/emails` - Debug email parsing

#### CSV Import
- `POST /csv/import` - Import CSV file with receipts

#### Database
- `GET /database/users` - List all users
- `GET /database/stats` - Database statistics and health
- `DELETE /database/users/:id` - Delete user and all receipts

#### Receipts
- `GET /receipts` - Get receipts with pagination

#### Validation
- `GET /validation/user/:userId/summary` - User data summary and validation

### Data Models

#### User
```typescript
interface User {
  id: string;           // UUID
  email: string;        // User email
  createdAt: Date;      // Creation timestamp
}
```

#### Receipt
```typescript
interface Receipt {
  id: string;           // UUID
  userId: string;       // User UUID
  restaurantName: string;
  orderDate: Date;
  amountSpent: number;  // Total amount
  items: ReceiptItem[]; // JSONB array
  dataSource: DataSource; // CSV | EMAIL
  createdAt: Date;
}

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

enum DataSource {
  CSV = 'csv',
  EMAIL = 'email'
}
```

## 🎨 Viral Features

### Social Sharing
- **Monthly spending summaries** with beautiful charts
- **Top restaurants breakdown** with shareable graphics
- **Year-in-review** summaries (Spotify Wrapped style)
- **Native social sharing** to Instagram, TikTok, Twitter
- **Achievement badges** and spending milestones

### User Journey
1. **Onboarding**: Simple email signup
2. **CSV Upload**: Drag & drop Uber Eats CSV files
3. **Instant Analysis**: Beautiful spending breakdown
4. **Social Sharing**: One-tap sharing to social media
5. **Viral Growth**: Friends see amazing summaries and join

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ - [Download here](https://nodejs.org/)
- Docker & Docker Compose - [Download here](https://docker.com/)
- Git - [Download here](https://git-scm.com/)

### One-Command Setup
```bash
# Clone and setup
git clone https://github.com/harry-david-brown/SnackTrackApp.git
cd SnackTrackApp
npm run setup

# Start the app
npm start
```

That's it! The setup script will:
- ✅ Check all requirements
- ✅ Install dependencies  
- ✅ Set up environment files
- ✅ Start development database
- ✅ Verify everything works

### Development Commands
```bash
npm start              # Start Expo dev server
npm run android        # Run on Android
npm run ios           # Run on iOS (macOS only)
npm run web           # Run on web
npm run db:start      # Start database
npm run db:stop       # Stop database
npm test             # Run tests
```

> 📖 **For detailed setup instructions**, see [DEVELOPMENT.md](./DEVELOPMENT.md)

## 📋 Project Status

### ✅ Completed (API)
- [x] Streamlined API endpoints (70% reduction in complexity)
- [x] Comprehensive error handling with custom error classes
- [x] Rate limiting and security middleware
- [x] Swagger/OpenAPI documentation
- [x] Database schema optimization
- [x] CSV import functionality
- [x] User management system

### 🔄 In Progress (Frontend)
- [x] Technology stack decision
- [x] Project structure planning
- [x] Expo project initialization
- [ ] Development environment setup
- [ ] Basic navigation structure
- [ ] API integration setup

### 📅 Upcoming
- [ ] User flow wireframes
- [ ] Component library planning
- [ ] Brand identity and styling
- [ ] Unit test framework setup
- [ ] API endpoint testing
- [ ] Database integration tests

### **Complete Frontend** - Full React Native app
- [ ] Authentication screens (login/register)
- [ ] Dashboard with spending overview
- [ ] Receipt history and details
- [ ] CSV upload functionality
- [ ] Settings and user management

## 🎯 Key Design Decisions

### Data Strategy
- **CSV Priority**: CSV data is the single source of truth
- **No Complex Deduplication**: Simplified approach, CSV overwrites other data
- **Streamlined Models**: Removed bloated fields (tax, tip, delivery fees, email fields)
- **Single User Type**: No account types, just email-based users

### API Philosophy
- **Single Responsibility**: Each endpoint has one clear purpose
- **Production Ready**: Rate limiting, security, error handling
- **Well Documented**: Complete Swagger documentation

### Frontend Strategy
- **Mobile-First**: Optimized for mobile sharing
- **Viral Growth**: Built for social media sharing
- **Simple UX**: Minimal steps to value
- **Beautiful Design**: Shareable, Instagram-worthy summaries

## 🔧 Technical Details

### Rate Limiting (Viral App Strategy)
- **User Creation**: 100 requests per 15 minutes
- **CSV Import**: 50 requests per 15 minutes
- **Email Operations**: 200 requests per 15 minutes
- **General API**: 1000 requests per 15 minutes

### Security Features
- Helmet.js security headers
- CORS configuration
- Request size limiting
- Progressive slow-down for abuse
- Security logging

### Error Handling
- Custom error classes (ValidationError, NotFoundError, etc.)
- Centralized error middleware
- Structured JSON error responses
- Input validation middleware

## 🚀 Deployment Strategy

### API Deployment
- Docker containerization
- PostgreSQL database
- Environment-based configuration
- Health check endpoints

### App Deployment
- EAS Build & Submit
- Expo Updates for OTA updates
- Environment-specific builds
- Automated testing pipeline

## 📞 API Examples

### Create User
```bash
curl -X POST http://localhost:3000/users/create \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

### Import CSV
```bash
curl -X POST http://localhost:3000/csv/import \
  -F "csvFile=@uber-orders.csv" \
  -F "userId=123e4567-e89b-12d3-a456-426614174000"
```

### Get User Summary
```bash
curl http://localhost:3000/validation/user/123e4567-e89b-12d3-a456-426614174000/summary
```

## 🎯 Success Metrics

### Viral Growth
- Social media shares per user
- Friend referral rate
- Time spent in app
- User retention after sharing

### Technical Performance
- API response times < 200ms
- App load time < 3 seconds
- Crash rate < 0.1%
- 99.9% uptime

---

**Ready to build the next viral food tracking app! 🚀**

*This README contains all the context needed for frontend development. The API is production-ready and documented. Focus on creating beautiful, shareable user experiences.*
