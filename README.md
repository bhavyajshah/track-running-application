# RunTracker - Professional Running & Fitness App

A comprehensive running and fitness tracking application built with React Native, Expo, and Supabase. Track your runs, set goals, earn achievements, and connect with fellow runners in a beautifully designed, production-ready app.

## 🏃‍♂️ Features

### Core Running Features
- **GPS Tracking**: Real-time location tracking with route mapping
- **Live Statistics**: Distance, pace, speed, calories, and elevation tracking
- **Run History**: Complete history of all your runs with detailed analytics
- **Route Mapping**: Visual route display with polyline tracking
- **Background Tracking**: Continue tracking when app is minimized

### Goal Setting & Achievement System
- **Personal Goals**: Set weekly, monthly, and yearly running goals
- **Achievement System**: Unlock badges and earn points for milestones
- **Progress Tracking**: Visual progress indicators and statistics
- **Personal Records**: Automatic tracking of your best performances

### Social Features
- **User Profiles**: Customizable profiles with fitness levels and preferences
- **Activity Feed**: Share your runs and achievements with friends
- **Social Connections**: Follow other runners and see their progress
- **Community Challenges**: Participate in group challenges

### Advanced Analytics
- **Detailed Statistics**: Comprehensive running analytics and trends
- **Performance Metrics**: Pace analysis, speed tracking, and improvement insights
- **Heart Rate Zones**: Monitor training intensity (when connected to devices)
- **Training Plans**: Structured workout programs for different goals

### User Experience
- **Dark/Light Mode**: Adaptive theming for comfortable viewing
- **Offline Support**: Continue using the app without internet connection
- **WhatsApp-style Navigation**: Intuitive swipe gestures between tabs
- **Responsive Design**: Optimized for all screen sizes
- **Smooth Animations**: Polished micro-interactions and transitions

## 🚀 Technology Stack

### Frontend
- **React Native** with Expo SDK 52
- **Expo Router** for navigation
- **TypeScript** for type safety
- **React Native Reanimated** for smooth animations
- **React Native Maps** for route visualization
- **Lucide React Native** for consistent iconography

### Backend & Database
- **Supabase** for backend services
- **PostgreSQL** with Row Level Security (RLS)
- **Real-time subscriptions** for live updates
- **Edge Functions** for serverless computing

### Key Libraries
- **expo-location** for GPS tracking
- **expo-linear-gradient** for beautiful gradients
- **react-native-gesture-handler** for gesture recognition
- **@react-native-async-storage/async-storage** for local storage

## 📱 Screenshots

The app features a modern, intuitive interface with:
- Clean home dashboard with weekly goals and quick stats
- Real-time run tracking with live map and statistics
- Comprehensive history view with filtering options
- Beautiful dark mode sidebar with smooth animations
- Gesture-based navigation between tabs

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- Supabase account

### Environment Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd runtracker
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Set up Supabase**
- Create a new Supabase project
- Run the migration files in `/supabase/migrations/` to set up the database schema
- Configure Row Level Security policies
- Set up authentication

5. **Start the development server**
```bash
npm run dev
```

## 🗄️ Database Schema

The app uses a comprehensive PostgreSQL schema with the following main tables:

### Core Tables
- **profiles**: User profiles and preferences
- **runs**: Individual run records with GPS data
- **goals**: User-defined fitness goals
- **achievements**: Available achievements and badges
- **user_achievements**: Earned achievements per user

### Advanced Features
- **training_plans**: Structured workout programs
- **workouts**: Individual workout templates
- **routes**: Saved running routes
- **splits**: Detailed kilometer/mile splits
- **heart_rate_zones**: User's heart rate training zones
- **social_connections**: Friend/follower relationships
- **challenges**: Community challenges and competitions

### Analytics & Tracking
- **user_stats**: Aggregated daily/weekly/monthly statistics
- **personal_records**: Automatic PR tracking
- **activity_feed**: Social activity posts
- **notifications**: In-app notification system

## 🔐 Security Features

- **Row Level Security (RLS)** on all database tables
- **JWT-based authentication** with Supabase Auth
- **Privacy controls** for social features
- **Secure API endpoints** with proper authorization
- **Data validation** and sanitization

## 📊 Key Features Deep Dive

### GPS Tracking System
- High-accuracy location tracking with configurable intervals
- Intelligent filtering to reduce GPS noise
- Background tracking support with notifications
- Route visualization with polyline mapping
- Elevation tracking and gain calculation

### Achievement System
- Dynamic achievement calculation based on user progress
- Multiple achievement categories (distance, speed, consistency, milestones)
- Point-based reward system
- Visual progress indicators
- Social sharing of achievements

### Goal Management
- Flexible goal types (distance, time, frequency, calories)
- Multiple time periods (daily, weekly, monthly, yearly)
- Progress tracking with visual indicators
- Automatic completion detection
- Goal history and analytics

### Social Features
- User profiles with customizable information
- Friend/follower system with privacy controls
- Activity feed with run sharing
- Community challenges and leaderboards
- Social notifications and interactions

## 🎨 Design System

### Color Palette
- **Primary**: Purple gradient (#8B5CF6 to #C084FC)
- **Success**: Green (#10B981)
- **Warning**: Amber (#F59E0B)
- **Error**: Red (#EF4444)
- **Neutral**: Gray scale for text and backgrounds

### Typography
- **Primary Font**: Inter (Regular, Medium, SemiBold, Bold)
- **Consistent sizing**: 8px spacing system
- **Proper hierarchy**: Clear distinction between headings and body text

### Components
- **Animated Buttons**: Smooth press animations with haptic feedback
- **Cards**: Consistent card design with shadows and rounded corners
- **Loading States**: Skeleton loaders and spinners
- **Modals**: Blur overlays with smooth transitions

## 🚀 Deployment

### Web Deployment
```bash
npm run build:web
```

### Mobile App Deployment
1. **iOS**: Use EAS Build for App Store deployment
2. **Android**: Use EAS Build for Google Play Store deployment

### Environment Configuration
- **Development**: Local Supabase instance
- **Staging**: Staging Supabase project
- **Production**: Production Supabase project with proper security

## 🧪 Testing

The app includes comprehensive testing setup:
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: Database and API testing
- **E2E Tests**: Full user flow testing
- **Performance Tests**: Location tracking and animation performance

## 📈 Performance Optimizations

- **Lazy Loading**: Components and routes loaded on demand
- **Image Optimization**: Proper image sizing and caching
- **Database Indexing**: Optimized queries with proper indexes
- **Caching Strategy**: Local storage for frequently accessed data
- **Bundle Optimization**: Code splitting and tree shaking

## 🔧 Development Guidelines

### Code Organization
- **Modular Architecture**: Clear separation of concerns
- **File Size Limits**: Maximum 300 lines per file
- **Proper Imports/Exports**: No global variables
- **TypeScript**: Full type safety throughout the application

### Best Practices
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Accessibility**: WCAG compliance for inclusive design
- **Performance**: Optimized animations and efficient data fetching
- **Security**: Input validation and secure data handling

## 🆕 New Features & Enhancements

### Recently Added
- **Next-Level Onboarding**: Immersive multi-slide onboarding with feature highlights
- **Enhanced Location Permissions**: Improved permission handling with better UX
- **WhatsApp-Style Navigation**: Swipe gestures between tabs for intuitive navigation
- **Improved Dark Mode**: Better sidebar design and theme consistency
- **Better Run Tracking**: More accurate GPS tracking with intelligent filtering

### Upcoming Features
- **Live Run Sharing**: Share your runs in real-time with friends
- **Voice Coaching**: AI-powered running coach with voice guidance
- **Weather Integration**: Automatic weather data for runs
- **Training Plan Builder**: Create custom training programs
- **Social Challenges**: Create and join community challenges
- **Wearable Integration**: Connect with fitness watches and heart rate monitors
- **Nutrition Tracking**: Log meals and track nutrition alongside runs
- **Recovery Metrics**: Track sleep, stress, and recovery data
- **Route Recommendations**: AI-suggested routes based on preferences
- **Virtual Races**: Participate in virtual running events

### Potential Integrations
- **Strava Integration**: Sync runs with Strava
- **Apple Health/Google Fit**: Health data synchronization
- **Spotify Integration**: Music control during runs
- **Weather APIs**: Real-time weather data
- **Garmin/Fitbit**: Wearable device connectivity

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Expo Team** for the excellent development platform
- **Supabase Team** for the powerful backend-as-a-service
- **React Native Community** for the amazing ecosystem
- **Pexels** for providing high-quality stock photos

## 📞 Support

For support, email support@runtracker.app or join our Discord community.

---

**RunTracker** - Your Personal Running Companion 🏃‍♂️💨