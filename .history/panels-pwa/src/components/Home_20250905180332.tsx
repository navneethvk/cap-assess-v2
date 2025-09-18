import React from 'react';
import useAuthStore from '../store/authStore';
import useAppStore from '../store/appStore';
import { notify } from '../utils/notify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateCarousel } from './ui/date-carousel';

import VisitsTimeline from './VisitsTimeline';
import { PrimaryPopupButton } from './ui/primary-button';

const Home: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { currentTheme, setTheme, getEffectiveTheme } = useAppStore();
  const themes = ["light", "dark", "system"];
  const effectiveTheme = getEffectiveTheme();

  const handleLogout = async () => {
    try {
      await logout();
      notify.success('Logged out successfully!');
    } catch (error) {
      if (error instanceof Error) {
        notify.error(error.message);
      } else {
        notify.error('An unknown error occurred during logout.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col modern-glass">
      <div className="flex-grow p-3 sm:p-4 pb-16 sm:pb-20">
        <div className="w-full max-w-4xl mx-auto">
          <Card className="home-card">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="modern-gradient-text text-xl sm:text-2xl">My Visits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
              <DateCarousel />
              <VisitsTimeline />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;
