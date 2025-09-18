# Child Care Institution Assessment PWA

A modern Progressive Web Application (PWA) built with React, Firebase, and advanced physics-based animations for managing Child Care Institution (CCI) assessments.

## 🚀 Features

### Core Functionality
- **Role-Based Authentication**: Secure user management with Pending, User, and Admin roles
- **CCI Management**: Comprehensive system for managing Child Care Institutions
- **User Assignment**: Admin tools for assigning users to CCIs
- **Progressive Web App**: Installable on Android & iOS with offline fallback support
- **Scheduled CSV Backups**: Nightly Cloud Function exports the `visits` collection to Cloud Storage
- **Admin On-Demand Backups**: "Backup notes" button in Admin ▸ Import Notes triggers the same export instantly
- **Real-time Data**: Firebase Firestore integration with live updates

### UI/UX Highlights
- **Modern Push Button Design**: 3D buttons with solid offset shadows and oval pill shapes
- **Healthcare Aesthetic**: Clean, modern design inspired by healthcare applications like Pomegranate Health
- **Physics-Based Interactions**: Realistic button press effects using Motion library
- **Responsive Design**: Mobile-first approach with TailwindCSS v4
- **Dark/Light Themes**: System-aware theme switching with smooth transitions
- **Touch-Optimized**: Tactile button animations that respond to clicks, taps, and hover states

## 🛠 Tech Stack

### Frontend (panels-pwa/)
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Motion** - Advanced animation library (successor to Framer Motion)
- **TailwindCSS v4** - Utility-first CSS framework
- **shadcn/ui** - High-quality UI components
- **Zustand** - Lightweight state management
- **SWR** - Data fetching with caching
- **React Router v7** - Client-side routing

### Backend & Services
- **Firebase Authentication** - Secure user management
- **Cloud Firestore** - NoSQL database with real-time updates
- **Cloud Functions** - Serverless backend logic
  - `exportVisitsCsvNightly`: schedules 03:00 Asia/Kolkata CSV backups to Cloud Storage
  - `panelExportVisitsCsv`: callable admin-only export used by the UI backup button
- **Firebase Hosting** - Static site hosting
- **Cloud Storage** - Stores generated CSV backups under `gs://<bucket>/<prefix>/visits_TIMESTAMP.csv`

### Animation System
- **Motion Library** - Unified animation engine
- **3D Transforms** - Hardware-accelerated animations
- **Spring Physics** - Natural movement with mass, stiffness, and damping
- **Magnetic Effects** - Touch-responsive liquid animations
- **Gesture Recognition** - Click, tap, and hover interactions

## 📱 Animation Features

### Magnetic-Liquid Physics
- **Fluid Hover Effects**: Elements respond with 3D rotations and scale transforms
- **Touch Feedback**: Tactile animations on click/tap with spring physics
- **Magnetic Pull**: Components attract interaction with smooth transitions
- **Liquid Motion**: Organic movement patterns with custom easing curves

### Physics Presets
```typescript
springs: {
  fluid: { stiffness: 300, damping: 35 },
  magnetic: { stiffness: 500, damping: 28 },
  liquid: { stiffness: 250, damping: 40 }
}
```

### Component Variants
- **MagneticButton**: Enhanced button with 3D magnetic effects
- **PhysicsCard**: Cards with liquid hover animations
- **StaggerContainer**: Orchestrated group animations
- **FadeSlide**: Smooth entrance/exit transitions

## 🏗 Architecture

### Multi-Project Structure
```
cap-assess-pwa/
├── panels-pwa/          # React PWA frontend
├── functions/           # Firebase Cloud Functions
├── firebase.json        # Firebase configuration
├── firestore.rules      # Database security rules
└── CLAUDE.md           # Development guidelines
```

### State Management
- **authStore**: Firebase authentication state
- **userStore**: User profile management
- **appStore**: Application settings (theme, preferences)

### Data Flow
1. **Authentication**: Firebase Auth with custom claims
2. **Authorization**: Role-based access control in Firestore rules
3. **Data Fetching**: SWR with automatic caching and revalidation
4. **Real-time Updates**: Firestore snapshots for live data

## 🎨 Design System

### Color Palette
- **Primary**: Soft pink (#FF6F89) - Healthcare-inspired warm accent
- **Secondary**: Warm cream backgrounds for approachable feel
- **Background**: Clean white/cream with burgundy text
- **Accent**: Light pink accents for subtle highlights

### Typography
- **System Fonts**: Modern sans-serif with 600 weight and letter-spacing
- **Clean Aesthetic**: Readable, professional healthcare-style typography
- **Consistent Spacing**: Enhanced letter-spacing (0.05em) for clarity

### Animation Principles
- **Physics-Based**: Natural spring animations
- **Responsive**: Touch and gesture feedback
- **Performant**: Hardware-accelerated transforms
- **Accessible**: Respects reduced motion preferences

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- Firebase CLI
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone [repository-url]
cd cap-assess-pwa
```

2. **Install dependencies**
```bash
# Root level (Firebase)
npm install

# Frontend
cd panels-pwa
npm install

# Functions
cd ../functions
npm install
```

3. **Environment Setup**
Create `panels-pwa/.env` with Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. **Development**
```bash
# Start PWA development server
cd panels-pwa
npm run dev

# Start Firebase emulators (separate terminal)
cd ..
firebase emulators:start
```

### Cloud Function Configuration
The export functions expect Cloud Storage settings via runtime config. Run once per project (replace the bucket/prefix as needed; prefix defaults to `backups/visits`):

```bash
firebase functions:config:set \
  exports.bucket="your-export-bucket" \
  exports.prefix="backups/visits"

# Deploy functions after updating config
npm --prefix functions run build
firebase deploy --only functions
```

### PWA Details
- Manifest (`public/manifest.webmanifest`) declares icons, scope, shortcuts, and theme color for install banners.
- A custom service worker (`public/service-worker.js`) caches navigation requests and serves `offline.html` when the network is unavailable.
- `src/main.tsx` registers the service worker after the app loads; no extra work is needed for users to install the app.

To test installation locally:
1. Build and preview the app (`npm --prefix panels-pwa run build && npm --prefix panels-pwa run preview`).
2. Open the preview URL in Chrome or Safari on a device; use “Add to Home Screen” / “Install app”.
3. Toggle airplane mode and revisit the app to see the offline fallback page.

## 📜 Scripts

### PWA Development (panels-pwa/)
```bash
npm run dev          # Start development server
npm run build        # Production build with TypeScript check
npm run lint         # ESLint code analysis
npm run preview      # Preview production build
```

### Firebase Functions (functions/)
```bash
npm run build        # Compile TypeScript
npm run serve        # Local emulator
npm run deploy       # Deploy to Firebase
npm run logs         # View function logs
npm run lint         # ESLint for functions
```

### Firebase Deployment
```bash
firebase deploy                    # Deploy everything
firebase deploy --only functions  # Functions only
firebase deploy --only hosting    # Hosting only
firebase emulators:start          # Start all emulators
```

To deploy the PWA to Hosting after running a production build:
```bash
npm --prefix panels-pwa run build
firebase deploy --only hosting
```

If you only need to refresh the Cloud Storage backup code:
```bash
npm --prefix functions run build
firebase deploy --only functions
```

## 🔐 Security & Roles

### User Roles
- **Pending**: New users awaiting admin approval
- **User**: Standard access to assessment features
- **Admin**: Full system access including user management

### Security Rules
- **Authentication Required**: All operations require valid Firebase auth
- **Role-Based Access**: Firestore rules enforce permission levels
- **Custom Claims**: Firebase Auth tokens carry role information
- **Audit Trail**: Soft delete patterns preserve data history

## 🎯 Recent Updates

### v3.0 - Modern Healthcare Design System
- ✅ Complete theme overhaul from cyberpunk to healthcare aesthetic
- ✅ Implemented modern push button design with solid offset shadows
- ✅ Created pill-shaped buttons (9999px border-radius) for tactile feel
- ✅ Added healthcare-inspired color palette (soft pink, warm cream)
- ✅ Updated typography to modern sans-serif with enhanced letter-spacing
- ✅ Fixed tab button styling to maintain shadows across all states
- ✅ Removed background containers from tabs for cleaner appearance
- ✅ Enhanced navigation buttons with consistent push button styling

### Design System Updates
- **Modern Push Buttons**: 3D effect with solid offset shadows (4px 4px)
- **Hover States**: Diagonal lift (-5px, -5px) with extended shadow (9px 9px)  
- **Active States**: Button moves to shadow position (4px, 4px) with no shadow
- **Pill Shape**: Full oval borders for better tactile illusion
- **Healthcare Colors**: Warm, approachable palette suitable for care institutions
- **Clean Typography**: Professional, readable fonts with consistent spacing

### v3.1 - Admin Panel, Date UI, and Timeline Reordering

- Admin Panel
  - Simplified tab switcher to standard buttons (removed segmented tabs)
  - Added robust token refresh after role updates to sync custom claims
  - Improved error messages and logging for CCI and Assign panels

- Date Carousel
  - Infinite scrolling days with dynamic loading as you scroll
  - Centered selected date and applied primary blue highlight
  - Combined month/year into a single iOS-style dropdown selector
  - Fixed dropdown transparency with opaque content styles
  - Removed left/right buttons, centered controls, oval styling for picker and Today

- Visits Timeline
  - “Add Visit” redesigned to + buttons positioned above and below the list
  - Introduced custom `order` field for deterministic ordering
  - Real-time drag-and-drop reordering with compact card mode while moving
  - Move mode persists until Done is clicked; all cards compress for clarity
  - Frontend updates list locally during drag for smooth animation
  - Persist orders to Firestore only when Done is clicked
  - Offline support: queued order updates via persisted Zustand store
  - Automatic sync of queued updates when app comes back online

- Auth & Stores
  - `authStore` gained `refreshToken`, `clearStore`, and versioning
  - New `reorderStore` (Zustand + persist) stores move mode and pending updates

- Firestore & Hosting
  - Rules relaxed for Admin reads on `ccis` and `cci_user_links`
  - Hosting `public` changed to `panels-pwa/dist`

### Reordering: How It Works

- Start dragging any visit to enter move mode (cards compress)
- Items reorder instantly on the client as you move between positions
- Click Done to save; we normalize orders as 1000, 2000, 3000, ...
- Offline: we queue updates locally and auto-sync when online

### Developer Notes

- Env: ensure `panels-pwa/.env` is present with Firebase values (no quotes)
- If CCI/Assign tabs fail: confirm Auth custom claims; `AdminSettings` forces token refresh after updates
- If reordering feels off: see `VisitsTimeline.tsx` and `panels-pwa/src/store/reorderStore.ts`

## 🚀 Performance

### Optimization Features
- **Code Splitting**: Lazy-loaded route components
- **Tree Shaking**: Unused code elimination
- **Bundle Analysis**: Optimized dependency graph
- **Hardware Acceleration**: GPU-powered animations
- **Offline Support**: Service worker caching

### Animation Performance
- **60fps Target**: Smooth animations on all devices
- **Transform Optimization**: CSS transforms over layout changes
- **Spring Physics**: Natural motion with minimal computation
- **Gesture Debouncing**: Efficient event handling

## 📱 PWA Features

- **Offline Functionality**: Works without internet connection
- **App-like Experience**: Native app feel in the browser
- **Push Notifications**: Firebase Cloud Messaging integration
- **Install Prompt**: Add to home screen capability
- **Background Sync**: Data synchronization when back online

## 🧪 Testing

### Test Strategy
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: Firebase service integration
- **E2E Tests**: Complete user workflow validation
- **Performance Tests**: Animation frame rate monitoring

## 📈 Monitoring

### Analytics & Logging
- **Firebase Analytics**: User behavior tracking
- **Error Monitoring**: Crash reporting and debugging
- **Performance Monitoring**: Core web vitals tracking
- **Usage Metrics**: Feature adoption analysis

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Motion.dev** - Advanced animation capabilities
- **shadcn/ui** - Beautiful component library
- **Firebase** - Backend infrastructure
- **TailwindCSS** - Utility-first styling
- **Vite** - Next-generation build tool

---

Built with ❤️ using modern web technologies and physics-based animations.
