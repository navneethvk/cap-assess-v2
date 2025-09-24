import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAppStore from '@/store/appStore';
import useAuthStore from '@/store/authStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BarChart2, Calendar, Home, LogOut, Palette, Settings } from 'lucide-react';
import getInitials from '@/utils/getInitials';
import { notify } from '@/utils/notify';

const TopNavBar: React.FC = () => {
  const location = useLocation();
  const { currentTheme, setTheme, getEffectiveTheme } = useAppStore();
  const { user, logout } = useAuthStore();
  const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
  const effectiveTheme = getEffectiveTheme();

  const userInitials = getInitials(user?.displayName || user?.email || '');

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

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="hidden md:block sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
      <div className="mx-auto w-full max-w-screen-2xl px-4">
        <div className="h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 text-foreground">
              <div className="h-7 w-7 rounded-sm bg-primary text-primary-foreground flex items-center justify-center">
                <Calendar className="h-4 w-4" />
              </div>
              <span className="font-semibold tracking-wide">CCI Assess</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                to="/"
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  isActive('/') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2"><Home className="h-4 w-4" /> Timeline</div>
              </Link>
              <Link
                to="/calendar"
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  isActive('/calendar') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Calendar</div>
              </Link>
              <Link
                to="/stats"
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  isActive('/stats') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2"><BarChart2 className="h-4 w-4" /> Stats</div>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="primary-button hidden lg:inline-flex h-9 px-3">
                  Theme: {currentTheme === 'system' ? `${currentTheme} (${effectiveTheme})` : currentTheme}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="modern-border">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Palette className="h-4 w-4" /> Theme
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {themes.map((themeName) => (
                  <DropdownMenuItem
                    key={themeName}
                    onClick={() => setTheme(themeName)}
                    className={currentTheme === themeName ? 'bg-accent' : ''}
                  >
                    {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                    {themeName === 'system' && ` (${effectiveTheme})`}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-muted">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs font-bold">{userInitials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium">
                    {user?.displayName || user?.email}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="modern-border">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" /> Admin Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNavBar;

