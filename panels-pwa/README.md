# panels-pwa

This project is a Progressive Web Application (PWA) built using Vite, React, TypeScript, Firebase, and TailwindCSS.

## Project Purpose

The primary goal of this application is to provide a simple, authenticated user experience with a login page and a welcoming home page.

## Personality

I will behave as a proactive and autonomous AI assistant. I will take the initiative to update this README file whenever I believe it's relevant, without waiting for user input. This includes adding new sections, updating existing content, and ensuring the documentation remains accurate and up-to-date with the project's status.

## Prompts

This section will store all the prompts that are used to interact with the AI assistant.

## Folder Structure

```
panels-pwa/
├── .env                  # Environment variables (Firebase config). In .gitignore.
├── index.html            # Main HTML entry point for Vite.
├── package.json          # Project dependencies and scripts.
├── postcss.config.js     # PostCSS configuration for TailwindCSS.
├── tailwind.config.js    # TailwindCSS configuration.
├── tsconfig.json         # TypeScript compiler options.
├── vite.config.ts        # Vite configuration.
└── src/
    ├── App.tsx           # Main application component, handles auth state.
    ├── firebase.ts       # Firebase initialization and service exports.
    ├── index.css         # Global styles and TailwindCSS directives.
    ├── main.tsx          # Main entry point for the React application.
    └── components/
        ├── Home.tsx      # The home page component shown after login.
        └── Login.tsx     # The login page component.
```

## User Authentication and Role Management

This application implements a robust user authentication and role management system using Firebase Authentication, Firestore, and Firebase Cloud Functions.

### Role-Based Access Control (RBAC)

User roles are managed through custom claims in Firebase Authentication tokens and synchronized with a `role` field in the `users` Firestore collection. The following roles are currently supported:

-   **Pending:** New users are assigned this role by default. They have limited access to the application and are redirected to an "Awaiting Review" page.
-   **User:** Standard users with full access to the application's core features.
-   **Admin:** Users with administrative privileges, including access to the Admin Panel to manage other user roles and statuses.

### Cloud Functions for User Management

Firebase Cloud Functions are used to automate and secure user-related operations:

-   **`createUserRecord` (Auth `onCreate` Trigger):**
    -   **Trigger:** Fired automatically when a new user signs up via Firebase Authentication.
    -   **Action:** Creates a corresponding document in the `users` Firestore collection (`/users/{userId}`).
    -   **Default Role:** Assigns a default `role` of "Pending" to the new user in Firestore.

-   **`updateUserRoleClaim` (Firestore `onUpdate` Trigger):**
    -   **Trigger:** Fired when a user's document in the `users` Firestore collection is updated.
    -   **Action:** Synchronizes the `role` field from the Firestore document to the user's custom claims in Firebase Authentication. This ensures that changes made to a user's role in Firestore (e.g., by an Admin) are reflected in their authentication token.

-   **`deactivateUser` (HTTPS Callable Function):**
    -   **Trigger:** Called from the frontend (e.g., by an Admin user from the Admin Panel).
    -   **Action:**
        1.  **Disables the user in Firebase Authentication:** Prevents the user from logging in.
        2.  **Updates the user's Firestore document:** Sets a `status` field to `'deactivated'` and records a `deactivatedAt` timestamp. This implements a "soft delete" for audit purposes, retaining user data while revoking access.
    -   **Permissions:** Only users with the "Admin" role can call this function.

### Firestore Security Rules

Firestore rules (`firestore.rules`) are configured to enforce role-based access control:

-   **`users` Collection:**
    -   Users can read their own profile.
    -   Admins can read any user's profile.
    -   Users can update their own profile, but *cannot* change their `role` or `status` fields.
    -   Admins can update any user's profile, including their `role` and `status`.

-   **Other Collections (`{document=**}`):**
    -   Only authenticated users whose `role` is a `string`, is *not* "Pending", and whose `status` is *not* "deactivated" have read and write access to other data in the application. This explicitly denies access if the `role` custom claim is missing or not a string, enhancing security.

### Frontend Implementation

-   **`RequireAuth.tsx`:** This component checks the user's authentication status and their custom claim `role`. If the user is authenticated and their role is "Pending", they are redirected to the "Awaiting Review" page.
-   **`AwaitingReview.tsx`:** A dedicated component displayed to users with the "Pending" role.
-   **`UserSettings.tsx` (Admin Panel):**
    -   Conditionally renders an "Admin Panel" section only for users with the "Admin" role.
    -   Displays a list of all users, their roles, and their status.
    -   Allows Admin users to change other users' roles (which triggers `updateUserRoleClaim`).
    -   Provides a "Deactivate" button to call the `deactivateUser` Cloud Function, initiating a soft delete.

This comprehensive setup ensures secure, granular control over user access and data management within the application.

## CCI Management

This application includes a feature for managing Child Care Institutions (CCIs). This is handled through a `ccis` collection in Firestore, with access restricted to Admin users.

### CCI Schema

The `ccis` collection has the following schema:

-   **name:** (string) The name of the CCI.
-   **city:** (string) The city where the CCI is located.
-   **cohort:** (string) The cohort the CCI belongs to. Can be one of `Test`, `Pilot`, `Alpha`, or `Archived`.
-   **mapLocation:** (string) A URL to the CCI's location on a map.
-   **phone:** (string) The contact phone number for the CCI.
-   **status:** (string) The current status of the CCI. Can be `active` or `inactive`.

### Access Control

-   Only users with the "Admin" role can read, write, and update documents in the `ccis` collection.

### User-CCI Assignment System

The application includes a comprehensive user-to-CCI assignment system managed through the **AssignUsers** component. This system allows administrators to assign users to Child Care Institutions as Engagement Managers (EMs).

#### Data Structure

The `cci_user_links` collection manages user-CCI relationships with the following structure:
-   **Document ID**: Uses `user_id` as the document ID for efficient querying and preventing duplicates
-   **`user_id`**: (string) The ID of the user being assigned
-   **`cci_id`**: (string[]) Array of CCI IDs where the user is assigned as an EM
-   **`isEM`**: ('yes' | 'no') Indicates if the user is assigned as an Engagement Manager

#### AssignUsers Component Features

The **AssignUsers** component (`src/components/AssignUsers.tsx`) provides:

**🎯 Intuitive User Interface:**
- Card-based layout showing each user with their current assignments
- Expandable interface - click '+' to see available CCIs to assign
- Visual separation: assigned CCIs shown with green background and "Remove" buttons
- Available CCIs shown in expandable section with "Assign" buttons

**💾 Flexible Save Options:**
- **Individual Save**: Save assignments for specific users
- **Bulk Save**: Save all pending changes at once
- Real-time change detection with visual indicators

**🔒 Data Integrity:**
- Uses `user_id` as Firestore document ID to prevent duplicate records
- Validates CCI and user IDs to prevent invalid assignments
- Filters out CCIs with malformed data automatically

**⚡ Performance Optimizations:**
- Optimized SWR settings to prevent unnecessary page refreshes
- Efficient state management using simple arrays instead of complex data structures
- Manual cache control - data only refreshes when explicitly saved

#### Technical Implementation

**State Management:**
```typescript
// Simple Record<string, string[]> structure for user assignments
const [userAssignments, setUserAssignments] = useState<Record<string, string[]>>({});
```

**Data Operations:**
- **Add CCI**: Spreads existing assignments and adds new CCI ID
- **Remove CCI**: Filters out the specified CCI ID from user's assignments
- **Save**: Uses `setDocument()` with `user_id` as document ID and merge option

**Error Handling:**
- Validates CCI and user IDs before operations
- Provides user-friendly error messages
- Gracefully handles malformed Firestore data

## Architectural & Design Decisions

*   **Build Tool:** Vite was chosen for its fast development server and build speeds.
*   **Framework:** React with TypeScript provides a robust and type-safe foundation for building user interfaces.
*   **Authentication:** Firebase Authentication is used for user management, specifically email and password sign-in. The authentication state is managed in the root `App.tsx` component, which conditionally renders either the `Login` or `Home` component.
*   **Styling:** TailwindCSS v4 with shadcn/ui components provides a utility-first approach with a custom retro console theme. The design features green-based colors, monospace typography, and special effects to create an authentic terminal/video game aesthetic.

### Responsive Design Principles

To ensure the PWA is responsive and mobile-friendly, the following principles are adhered to:

1.  **Mobile-First Design:** Development prioritizes mobile screens first, then progressively enhances for larger screens. TailwindCSS's responsive prefixes (`sm:`, `md:`, `lg:`) are inherently mobile-first.
2.  **Fluid Layouts:** Extensive use of Tailwind's `grid` and `flexbox` utilities for flexible and adaptable layouts. Fixed widths and heights are avoided in favor of percentages, `vw`/`vh`, `rem`/`em`, or Tailwind's spacing utilities.
3.  **Responsive Typography:** Responsive font sizes (e.g., `text-sm`, `md:text-base`, `lg:text-lg`) ensure readability across devices.
4.  **Flexible Media:** Images and videos are configured to scale within their containers using `max-w-full` and `h-auto`.
5.  **Viewport Meta Tag:** The `index.html` includes `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` for correct browser rendering on various devices.
6.  **shadcn/ui Responsiveness:** shadcn/ui components are built on Radix UI primitives and TailwindCSS, providing responsive behavior by default across different screen sizes.
7.  **Component-Level Responsiveness:** Responsive logic is encapsulated within individual React components using TailwindCSS responsive utilities.
8.  **Testing:** Regular testing is performed on actual mobile devices and browser developer tools' device emulators, covering various screen sizes, orientations, and device pixel ratios.

## Firebase Setup

*   Firebase configuration is stored in a `.env` file at the project root. This file is included in `.gitignore` to prevent committing sensitive API keys.
*   Vite exposes these environment variables to the application under the `import.meta.env` object. Variables must be prefixed with `VITE_` to be exposed.
*   The Firebase app is initialized in `src/firebase.ts`, which exports the necessary Firebase services like `auth`.
*   **Cloud Functions:** The project utilizes Firebase Cloud Functions for backend logic, including user management and synchronization with Firestore. Functions are located in the `functions/` directory at the project root.

## How to Run

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Add Firebase Configuration:**
    -   Copy your Firebase project configuration into the `.env` file.
3.  **Run the development server:**
    ```bash
    npm run dev
    ```

## State Management

This project uses [Zustand](https://zustand-bear.github.io/zustand/) for global state management. It provides a simple and efficient way to manage application state, replacing the previous React Context API for authentication state. The authentication state (user and loading status) is managed via `src/store/authStore.ts`. Additionally, `src/store/userStore.ts` manages user profile information, and `src/store/appStore.ts` handles application-wide settings like theme mode. All these stores utilize `zustand/middleware` for state persistence in `localStorage`.

### Persistence and Synchronization

To ensure a seamless user experience, the Zustand stores are configured to persist state in `localStorage` and synchronize across multiple tabs. This is achieved through the following configurations in the `persist` middleware:

-   **`storage`**: The `authStore` uses `createJSONStorage(() => localStorage)` to enable state persistence.
-   **`partialize`**: In `authStore`, the `partialize` option is used to selectively persist only the `user` object. This prevents the `loading` state from being persisted, ensuring that the application always shows a loading indicator when the authentication state is being initialized.
-   **`merge`**: The `appStore` and `userStore` use a custom `merge` function to deep-merge the persisted state with the initial state. This is crucial for preventing the stores from overwriting each other's data, which can happen when multiple stores are persisted to the same `localStorage` key.

## Routing

This project uses [React Router v6](https://reactrouter.com/en/main) for navigation. Route protection is implemented using Zustand's authentication state (`user` and `loading` from `useAuthStore`).

-   **Authentication Check:** The `App.tsx` component initializes the authentication state using `initializeAuth()` from `useAuthStore`. A skeleton loading fallback is displayed while Firebase checks the user's session.
-   **Protected Routes:** The `/` (home) route is protected using a custom `RequireAuth` component (`src/components/RequireAuth.tsx`). This component checks if a user is authenticated. If not, it redirects them to the `/login` page. It also displays a skeleton loading message while the authentication state is being determined.
-   **Public Routes:** The `/login` and `/signup` routes are public. If a user is already authenticated and tries to access these pages, they are redirected to the home page (`/`).

**Routing Structure in `App.tsx`:**

```tsx
<Routes>
  <Route element={<RequireAuth />}> {/* Protected routes go inside this wrapper */}
    <Route path="/" element={<Home />} />
  </Route>
  <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
  <Route path="/signup" element={!user ? <SignUp /> : <Navigate to="/" />} />
</Routes>
```

This setup ensures that only authenticated users can access protected parts of the application, providing a secure and intuitive user experience.

## Lazy Loading

This project uses `React.lazy` and `Suspense` to implement lazy loading for feature modules. This improves the initial load time of the application by splitting the code into smaller chunks that are loaded on demand.

-   **`React.lazy`:** Components are loaded dynamically using `React.lazy`. For example: `const Home = lazy(() => import('./components/Home'));`
-   **`Suspense`:** The `Routes` are wrapped in a `Suspense` component, which displays a fallback component while the lazy-loaded components are being fetched.

**Implementation in `App.tsx`:**

```tsx
import React, { useEffect, Suspense, lazy } from 'react';
// ... other imports

const Home = lazy(() => import('./components/Home'));
const Login = lazy(() => import('./components/Login'));
const SignUp = lazy(() => import('./components/SignUp'));
const UserSettings = lazy(() => import('./components/UserSettings'));
const AwaitingReview = lazy(() => import('./components/AwaitingReview'));

const SuspenseFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-screen">
    <span className="loading loading-spinner loading-lg"></span>
    <p className="mt-4 text-lg">Loading...</p>
  </div>
);

// ...

<Suspense fallback={<SuspenseFallback />}>
  <Routes>
    {/* ... routes */}
  </Routes>
</Suspense>
```

## Error Handling

This project implements a React Error Boundary to gracefully handle JavaScript errors that occur within the component tree. The `ErrorBoundary` component (`src/components/ErrorBoundary.tsx`) catches errors in its child components, prevents the entire application from crashing, and displays a user-friendly fallback message.

-   **Error Catching:** The `ErrorBoundary` uses `static getDerivedStateFromError` to update its state when an error is thrown, triggering a re-render with the fallback UI.
-   **Error Logging:** The `componentDidCatch` lifecycle method is used to log error details (error object and error info) to the console, which is crucial for debugging.
-   **Application Wrapping:** The entire React application is wrapped within the `ErrorBoundary` in `src/main.tsx`, ensuring that any unhandled errors in the component hierarchy are caught and managed centrally.

## Notifications

This project uses [Sonner](https://sonner.emilkowalski.com/) for a centralized and elegant notification system. It provides a `Toaster` component to display toasts and a reusable `notify.ts` utility for triggering various types of notifications.

-   **`notify.ts` Utility:** Located at `src/utils/notify.ts`, this file exports an object with `success`, `error`, and `info` methods. These methods wrap Sonner's `toast()` function, providing a consistent interface for displaying notifications throughout the application.
-   **Integration:** The `Toaster` component is integrated into `App.tsx` to ensure notifications are displayed globally. The `notify` utility methods are used in authentication handlers (e.g., `Login.tsx`, `SignUp.tsx`, `Home.tsx` for logout) to provide immediate feedback to the user on the success or failure of operations.

## Firestore Service

All interactions with Firestore are centralized in `src/firebase/firestoreService.ts`. This file exports asynchronous functions for common database operations, ensuring a consistent and maintainable approach to data management.

-   **`addDocument(collectionName, data)`:** Adds a new document to the specified collection.
-   **`getDocuments(collectionName, conditions?)`:** Retrieves documents from a collection. Supports optional query conditions.
-   **`updateDocument(collectionName, id, data)`:** Updates an existing document by its ID.
-   **`deleteDocument(collectionName, id)`:** Deletes a document by its ID.

**How to use:**
Instead of directly importing `firebase/firestore` methods into your UI components, import and use the functions from `src/firebase/firestoreService.ts`. This keeps your UI clean and separates concerns, making it easier to manage and test database operations.

## Stale-While-Revalidate (SWR) Data Fetching

This project utilizes [SWR](https://swr.vercel.app/) for efficient data fetching and caching, particularly for Firestore data. This approach ensures a universal stale-while-revalidate strategy across the PWA, providing a robust offline experience and immediate data freshness when the network is available.

-   **`useFirestoreCollection` Hook:** Located at `src/hooks/useFirestoreCollection.ts`, this custom React hook is designed to fetch data from Firestore collections. It leverages SWR's capabilities to:
    -   **Offline Caching:** Prioritize cached data, allowing users to view information even when offline or on a low-network connection.
    -   **Automatic Revalidation:** Automatically revalidate data from Firestore in the background, ensuring users receive the most updated version as soon as network connectivity is restored.
    -   **Real-time Updates (Optional):** While SWR primarily handles revalidation, it can be combined with Firestore's real-time listeners for more immediate updates if needed for specific use cases.

-   **Usage:**
    -   Import `useFirestoreCollection` into any component that needs to fetch data from a Firestore collection.
    -   Pass the collection path and optional query constraints to the hook.
    -   The hook returns `data`, `isLoading`, and `error` states, simplifying data management in your components.

This SWR implementation is compatible with Zustand for global state management and Firebase Authentication, providing a cohesive and performant data fetching layer for the application.

### Firebase Offline Persistence

To enhance the offline capabilities of the PWA, Firebase's offline persistence is enabled in `src/firebase.ts`. This feature caches a copy of the Firestore data that the app is actively using, allowing users to read, write, and query the cache even when they are offline. When the app reconnects to the internet, Firestore automatically synchronizes any local changes with the server.

This works in tandem with the SWR implementation, where `getDocs()` from Firestore will first return the cached data, and then SWR will revalidate the data in the background, ensuring a seamless and responsive user experience, regardless of network connectivity.

### Centralized Firestore Paths and Access Control

To improve maintainability and security, the application now uses a centralized approach for managing Firestore paths and access control.

-   **`src/firebase/paths.ts`:** This module contains pure functions for generating all Firestore collection and document paths. This eliminates hardcoded path strings in components and services, making the codebase cleaner and less prone to errors.

-   **`src/firebase/accessControl.ts`:** This module centralizes all access control logic. It defines user roles and provides functions to check if a user has the necessary permissions to perform certain actions. This makes it easier to manage and update security rules.

-   **`src/firebase/firestoreService.ts`:** The generic Firestore service has been refactored to use the centralized path generation functions from `paths.ts`, ensuring consistency across all database interactions.

This new structure provides a single source of truth for Firestore paths and access rules, making the application more robust, secure, and easier to maintain.

## Recent Improvements and Bug Fixes

### Fixed Data Fetching and Document ID Issues

**Problem Resolved:** The `useFirestoreCollection` hook was only mapping Firestore document IDs to the `uid` field, causing CCIs and other collections to have `undefined` IDs.

**Solution:** Updated the hook to map document IDs to both `id` and `uid` fields:
```typescript
// Before: Only uid field
return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

// After: Both id and uid fields for compatibility
return snapshot.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() }));
```

**Impact:** 
- Fixed CCI management and assignment functionality
- Resolved React key collision errors
- Improved data consistency across all components

### Optimized SWR Performance and Stability

**Problem Resolved:** The AssignUsers page was experiencing random refreshes due to aggressive SWR revalidation settings.

**Solution:** Implemented controlled revalidation settings:
```typescript
const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
  revalidateOnFocus: false,        // Don't refresh when window gets focus
  revalidateIfStale: false,        // Don't refresh stale data automatically  
  revalidateOnReconnect: false,    // Don't refresh on network reconnect
  refreshInterval: 0,              // Disable periodic refreshing
  dedupingInterval: 60000,         // Cache data for 1 minute
});
```

**Impact:**
- Eliminated random page refreshes
- Improved user experience and data stability
- Reduced unnecessary API calls
- Manual control over data refreshing

### Enhanced Firestore Security Rules

**Problem Resolved:** Permission errors when saving user-CCI assignments due to incomplete security rules.

**Solution:** Updated `firestore.rules` with:
- Removed duplicate rules for `cci_user_links` collection
- Added explicit `create` permission for admin operations
- Improved helper functions for cleaner rule logic
- Added user read permissions for their own assignment data

**Impact:**
- Fixed permission errors in AssignUsers component
- Improved security rule maintainability
- Better separation of admin and user permissions

### Data Structure Standardization

**Problem Resolved:** Inconsistent data structures between different collections and components.

**Solution:** Standardized the `cci_user_links` collection structure:
```typescript
interface CciUserLink {
  id?: string;           // Document ID = user_id
  user_id: string;       // User identifier
  cci_id: string[];      // Array of assigned CCI IDs
  isEM: 'yes' | 'no';    // Engagement Manager status
}
```

**Impact:**
- Improved data consistency and reliability
- Simplified querying by using user_id as document ID
- Prevented duplicate assignment records
- Enhanced data validation and error handling

## UI Components and Theming

This project combines [shadcn/ui](https://ui.shadcn.com/) components with TailwindCSS to create a retro console/video game aesthetic with a custom green-based color palette.

### Theme System Architecture

**shadcn/ui Integration:**
- Uses shadcn/ui components built on Radix UI primitives
- Components located in `src/components/ui/` with TypeScript definitions
- Provides accessible, customizable base components (Button, Card, Input, etc.)

**Retro Console Theme:**
- Custom CSS properties in `src/index.css` define a green-based retro aesthetic
- Light and dark mode variants with appropriate contrast and readability
- Monospace typography (`JetBrains Mono`, `SF Mono`) for console feel
- Special effects: text glow, retro borders, scanlines, and cursor animations

**Theme Management:**
- Simple light/dark/system theme switching via `src/store/appStore.ts`
- Zustand store with localStorage persistence and system preference detection
- Theme applied via CSS classes on document element (`.dark` class toggles)
- No complex theme providers - direct CSS custom property manipulation

### Color Palette

**Light Mode (Retro Console Green):**
- Background: Light gray (`--background: 0 0% 98%`)
- Primary: Dark green (`--primary: 120 100% 35%`)
- Accent colors: Muted greens for consistency
- Subtle shadows instead of glows for better readability

**Dark Mode (Terminal Green):**
- Background: Near black (`--background: 0 0% 8%`)
- Primary: Bright green (`--primary: 120 100% 50%`)
- Strong glow effects for authentic terminal feel
- High contrast for striking visual appeal

### Retro Styling Effects

**CSS Classes:**
- `.retro-glow`: Mode-adaptive text glow effects
- `.retro-border`: Inset shadow borders with green accents
- `.retro-scanlines`: Subtle overlay effect for CRT monitor simulation
- `.console-cursor`: Blinking cursor animation

**Typography:**
- Monospace font stack prioritizing modern terminal fonts
- Uppercase text transforms on buttons and headings
- Console-style prompt prefixes (`>`) throughout the interface
- Consistent letter-spacing for retro computer aesthetic

This system provides a cohesive retro gaming/console experience while maintaining modern accessibility and usability standards.

## Animations

This project uses [@motionone/react](https://motion.dev/) for animations. It's a lightweight and performant animation library that works well with React.

To add an animation to a component, you can use the `motion` component and the `animate` prop. For example, to add a fade-in animation to a `div`, you can do the following:

```tsx
import { motion } from '@motionone/react';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  {/* Your content here */}
</motion.div>
```

This will animate the `div` from an initial state of being transparent and slightly shifted down to a final state of being fully opaque and in its original position.

## Important Note on Dependencies

Before installing any new dependencies, it is crucial to consult the latest official documentation for the package. This will ensure that you are following the most up-to-date installation and configuration instructions, which can save you from potential issues and breaking changes. This project was recently updated to the latest DaisyUI integration with Vite, which resolved a major styling issue.