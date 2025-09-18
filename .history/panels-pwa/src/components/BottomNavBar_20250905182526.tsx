import React from 'react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import { Link } from 'react-router-dom';
import { Home, BarChart2, Palette, Settings, LogOut } from 'lucide-react';
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const BottomNavBar: React.FC = () => {
  const { currentTheme, setTheme, getEffectiveTheme } = useAppStore();
  const { user, logout } = useAuthStore();
  const themes = ["light", "dark", "system"];
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

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background backdrop-blur supports-[backdrop-filter]:bg-background/95"
      variants={animationVariants.slideUp}
      initial="initial"
      animate="animate"
      transition={{ 
        type: "spring",
        stiffness: 400,
        damping: 30
      }}
    >
      <div className="flex justify-around items-center py-2 px-4 max-w-md mx-auto">
        <Link to="/timeline" className="flex flex-col items-center justify-center h-12 px-3">
          <Home className="h-5 w-5" />
          <span className="text-xs mt-1">TIMELINE</span>
        </Link>
        
        <Link to="/stats" className="flex flex-col items-center justify-center h-12 px-3">
          <BarChart2 className="h-5 w-5" />
          <span className="text-xs mt-1">STATS</span>
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
          
          <DropdownMenuContent align="end" className="w-56 mb-2 modern-border">
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
      </div>
    </motion.div>
  );
};

export default BottomNavBar;