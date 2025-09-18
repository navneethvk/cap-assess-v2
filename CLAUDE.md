# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### PWA Development (panels-pwa/)
```bash
cd panels-pwa
npm run dev          # Start development server with Vite
npm run build        # Build for production (runs TypeScript check first)
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Firebase Functions (functions/)
```bash
cd functions
npm run build        # Compile TypeScript to JavaScript
npm run serve        # Start Firebase emulator for functions
npm run deploy       # Deploy functions to Firebase
npm run logs         # View Firebase function logs
npm run lint         # Run ESLint on functions code
```

### Firebase Deployment
```bash
firebase deploy                    # Deploy everything
firebase deploy --only functions  # Deploy only functions
firebase deploy --only hosting    # Deploy only hosting
firebase emulators:start          # Start all Firebase emulators
```

## Project Architecture

This is a Firebase-powered PWA with a React frontend and Cloud Functions backend, implementing a role-based user management system for Child Care Institution (CCI) assessments.

### Multi-Project Structure
- **Root level**: Firebase configuration, shared dependencies
- **panels-pwa/**: React PWA frontend built with Vite
- **functions/**: Firebase Cloud Functions backend

### Frontend Architecture (panels-pwa/)

**State Management**: Zustand with localStorage persistence
- `src/store/authStore.ts`: Authentication state and Firebase auth integration
- `src/store/userStore.ts`: User profile data
- `src/store/appStore.ts`: Application settings (theme, etc.)

**Routing**: React Router v6 with protected routes
- Authentication-based route protection via `RequireAuth` component
- Role-based access control for admin features
- Lazy loading for all route components

**Data Fetching**: SWR (Stale-While-Revalidate)
- `src/hooks/useFirestoreCollection.ts`: Custom hook for Firestore collections
- Automatic caching and background revalidation
- Works with Firebase offline persistence

**Firebase Integration**:
- `src/firebase.ts`: Firebase app initialization
- `src/firebase/firestoreService.ts`: Generic CRUD operations
- `src/firebase/paths.ts`: Centralized Firestore path generation
- `src/firebase/accessControl.ts`: Role-based access control logic

**UI Framework**: 
- TailwindCSS v4 with shadcn/ui components
- Motion One for animations
- Sonner for notifications
- Mobile-first responsive design

### Backend Architecture (functions/)

**Cloud Functions**:
- `createUserRecord`: Auto-creates user profile on Firebase Auth signup, sets default "Pending" role
- `updateUserRoleClaim`: Syncs Firestore user role changes to Firebase Auth custom claims

**Security**: Comprehensive Firestore rules with role-based access control
- Users: Read own profile, admins read all
- CCIs: Admin-only access
- CCI-User Links: Admin-only access
- Default: Authenticated non-pending users only

### Role System
- **Pending**: New users, limited access, shown "Awaiting Review" page
- **User**: Standard access to application features  
- **Admin**: Full access including user management and CCI administration

### Data Models

**Users Collection** (`/users/{userId}`):
- email, uid, role, createdAt, status, deactivatedAt

**CCIs Collection** (`/ccis/{cciId}`):
- name, city, cohort (Test/Pilot/Alpha/Archived), mapLocation, phone, status

**CCI User Links** (`/cci_user_links/{userId}`):
- user_id, cci_isEM (array of CCI IDs where user is EM)

## Key Development Patterns

### Component Organization
- Lazy-loaded route components in `src/components/`
- UI components in `@/components/ui/` (aliased path)
- Error boundaries wrap the entire application

### Firebase Patterns
- Always use centralized paths from `src/firebase/paths.ts`
- Use generic Firestore service functions, not direct Firebase calls in components
- Check access control with functions from `src/firebase/accessControl.ts`
- All Cloud Functions should validate user roles before execution

### State Management Patterns
- Authentication state persists user object only (not loading state)
- Use Zustand stores for global state, React state for component-local state
- SWR for server state with automatic caching and revalidation

### Security Patterns
- Never hardcode role checks - use centralized access control functions
- All sensitive operations require both frontend and Firestore rules validation
- Custom claims in Firebase Auth tokens sync with Firestore role field
- Soft delete pattern for user deactivation (preserves audit trail)

## Environment Setup

Requires `.env` file in `panels-pwa/` with Firebase configuration:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Firebase project must have:
- Authentication enabled (email/password)
- Firestore database with security rules deployed
- Cloud Functions enabled (Node.js 18)
- Hosting configured to serve from `panels-pwa/dist`