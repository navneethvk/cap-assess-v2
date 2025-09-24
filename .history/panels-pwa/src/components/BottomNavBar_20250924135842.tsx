import React from 'react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import { Link } from 'react-router-dom';
import { Home, BarChart2, Palette, Settings, LogOut, StickyNote } from 'lucide-react';
import getInitials from '../utils/getInitials';
import { notify } from '../utils/notify';
import { motion } from 'motion/react';
import { animationVariants } from '@/lib/motion-physics';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const BottomNavBar: React.FC = () => {
  const { currentTheme, setTheme, getEffectiveTheme } = useAppStore();
  const { user, logout } = useAuthStore();
  const effectiveTheme = getEffectiveTheme();

  const userInitials = getInitials(user?.displayName || user?.email || '');

  const cycleTheme = () => {
    const themes = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex] as any);
  };

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
    <motion.div
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background backdrop-blur supports-[backdrop-filter]:bg-background/95"
      variants={animationVariants.slideUp}
      initial="initial"
      animate="animate"
      transition={{ 
        type: "spring",
        stiffness: 400,
        damping: 30
      }}
    >
      <div className="flex justify-around items-center py-2 px-4 max-w-lg sm:max-w-xl mx-auto">
        <Link to="/" className="flex flex-col items-center justify-center h-12 px-3">
          <Home className="h-5 w-5" />
          <span className="text-xs mt-1">DAY VIEW</span>
        </Link>
        
        <Link to="/stats" className="flex flex-col items-center justify-center h-12 px-3">
          <BarChart2 className="h-5 w-5" />
          <span className="text-xs mt-1">STATS</span>
        </Link>
        
        <Link to="/notes" className="flex flex-col items-center justify-center h-12 px-3">
          <StickyNote className="h-5 w-5" />
          <span className="text-xs mt-1">NOTES</span>
        </Link>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex flex-col items-center justify-center h-12 px-3 cursor-pointer">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs mt-1">MENU</span>
            </div>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent 
            align="end" 
            className="w-56 mb-2"
            style={{
              backgroundColor: 'hsl(var(--card))',
              color: 'hsl(var(--foreground))',
              borderColor: 'hsl(var(--border))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <DropdownMenuLabel style={{ color: 'hsl(var(--foreground))' }}>
              {user?.displayName || user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator style={{ backgroundColor: 'hsl(var(--border))' }} />
            
            <DropdownMenuItem 
              onClick={cycleTheme} 
              className="physics-interactive"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              <div className="flex items-center">
                <Palette className="mr-2 h-4 w-4" />
                Theme: {currentTheme === 'system' ? `${currentTheme} (${effectiveTheme})` : currentTheme}
              </div>
            </DropdownMenuItem>
            
            <DropdownMenuItem asChild className="physics-interactive">
              <Link to="/settings" style={{ color: 'hsl(var(--foreground))' }}>
                <div className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Admin Settings
                </div>
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator style={{ backgroundColor: 'hsl(var(--border))' }} />
            <DropdownMenuItem 
              onClick={handleLogout} 
              className="physics-interactive"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              <div className="flex items-center">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
};

export default BottomNavBar;
