
import React, { useEffect, Suspense, lazy } from 'react';
import useAuthStore from './store/authStore';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import RequireAuth from './components/RequireAuth';
import BottomNavBar from './components/BottomNavBar';

const Home = lazy(() => import('./components/Home'));
const Login = lazy(() => import('./components/Login'));
const SignUp = lazy(() => import('./components/SignUp'));
const AdminSettings = lazy(() => import('./components/AdminSettings'));
const Stats = lazy(() => import('./components/Stats'));
const AwaitingReview = lazy(() => import('./components/AwaitingReview'));

const SuspenseFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
    <div className="modern-gradient-text text-2xl font-semibold">
      Loading System...
    </div>
    <div className="mt-4 text-lg modern-cursor">
      Initializing
    </div>
  </div>
);

const App: React.FC = () => {
  const { user, loading, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <div className="modern-gradient-text text-2xl font-semibold">
          Loading System...
        </div>
        <div className="mt-4 text-lg modern-cursor">
          Initializing
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <Router>
        <div className="flex flex-col min-h-screen">
          <div className="flex-grow">
            <Suspense fallback={<SuspenseFallback />}>
              <Routes>
                <Route element={<RequireAuth />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/settings" element={<AdminSettings />} />
                  <Route path="/stats" element={<Stats />} />
                </Route>
                <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
                <Route path="/signup" element={!user ? <SignUp /> : <Navigate to="/" />} />
                <Route path="/awaiting-review" element={<AwaitingReview />} />
              </Routes>
            </Suspense>
          </div>
          {user && <BottomNavBar />}
        </div>
      </Router>
    </>
  );
};

export default App;
