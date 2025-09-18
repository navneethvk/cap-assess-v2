import React from 'react';
import useAuthStore from '../store/authStore';
import useAppStore from '../store/appStore';
import { notify } from '../utils/notify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Palette, Settings, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DateCarousel } from './ui/date-carousel';
import AddVisit from './AddVisit';
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
            <CardHeader className="px-4 sm:px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="modern-gradient-text text-xl sm:text-2xl">My Visits</CardTitle>
                <p className="text-muted-foreground text-sm sm:text-base">Timeline of your CCI visits</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <PrimaryPopupButton
                    className="text-xs sm:text-sm px-2 sm:px-3"
                    asChild={true}
                  >
                    User
                  </PrimaryPopupButton>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56 modern-border">
                  <DropdownMenuLabel>
                    {user?.displayName || user?.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="physics-interactive">
                      <div className="flex items-center">
                        <Palette className="mr-2 h-4 w-4" />
                        Theme: {currentTheme === 'system' ? `${currentTheme} (${effectiveTheme})` : currentTheme}
                      </div>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {themes.map((themeName) => (
                        <DropdownMenuItem
                          key={themeName}
                          onClick={() => setTheme(themeName as any)}
                          className={`physics-interactive ${currentTheme === themeName ? 'bg-accent' : ''}`}
                        >
                          {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                          {themeName === 'system' && ` (${getEffectiveTheme()})`}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuItem asChild className="physics-interactive">
                    <Link to="/settings">
                      <div className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Admin Settings
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="physics-interactive">
                    <div className="flex items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
