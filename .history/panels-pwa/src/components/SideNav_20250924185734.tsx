import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart2, Calendar, Home, LogOut, Settings, X, StickyNote, Eye, EyeOff } from 'lucide-react';
import useAppStore from '@/store/appStore';
import useAuthStore from '@/store/authStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import getInitials from '@/utils/getInitials';
import { notify } from '@/utils/notify';

interface SideNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SideNav: React.FC<SideNavProps> = ({ open, onOpenChange }) => {
  const location = useLocation();
  const { currentTheme, setTheme, getEffectiveTheme, seeAllVisits, setSeeAllVisits } = useAppStore();
  const { user, logout } = useAuthStore();
  const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
  const effectiveTheme = getEffectiveTheme();

  const userInitials = getInitials(user?.displayName || user?.email || '');

  const isActive = (path: string) => location.pathname === path;

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

  // Focus trap and ESC to close
  const drawerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
        return;
      }
      if (e.key === 'Tab') {
        const root = drawerRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusables).filter(el => !el.hasAttribute('disabled'));
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !root.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      // Focus first focusable in drawer after mount
      setTimeout(() => {
        const root = drawerRef.current;
        if (!root) return;
        const el = root.querySelector<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
        el?.focus();
      }, 0);
    } else {
      previouslyFocused.current?.focus?.();
    }
  }, [open]);

  return (
    <div className="md:block">
      {open && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/30" onClick={() => onOpenChange(false)} />
          {/* Drawer */}
          <div ref={drawerRef} className="absolute left-0 top-0 h-full w-72 bg-background side-drawer border-r shadow-xl flex flex-col outline-none" tabIndex={-1}>
            {/* Header */}
            <div className="px-4 py-4 border-b flex items-center gap-3">
              <button aria-label="Close menu" onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-md border flex items-center justify-center hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-bold">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{user?.displayName || user?.email}</div>
                <div className="text-xs text-muted-foreground truncate">Theme: {currentTheme === 'system' ? `${currentTheme} (${effectiveTheme})` : currentTheme}</div>
              </div>
            </div>

            {/* Nav links */}
            <nav className="flex-1 px-2 py-3 space-y-1 overflow-auto">
              <Link to="/" onClick={() => onOpenChange(false)} className={`flex items-center gap-3 px-3 py-2 rounded-md ${isActive('/') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <Home className="h-4 w-4" /> Day View
              </Link>
              <Link to="/monthview" onClick={() => onOpenChange(false)} className={`flex items-center gap-3 px-3 py-2 rounded-md ${isActive('/monthview') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <Calendar className="h-4 w-4" /> Month View
              </Link>
              <Link to="/stats" onClick={() => onOpenChange(false)} className={`flex items-center gap-3 px-3 py-2 rounded-md ${isActive('/stats') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <BarChart2 className="h-4 w-4" /> Stats
              </Link>
              <Link to="/notes" onClick={() => onOpenChange(false)} className={`flex items-center gap-3 px-3 py-2 rounded-md ${isActive('/notes') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <StickyNote className="h-4 w-4" /> Notes
              </Link>
              <Link to="/settings" onClick={() => onOpenChange(false)} className={`flex items-center gap-3 px-3 py-2 rounded-md ${isActive('/settings') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <Settings className="h-4 w-4" /> Admin Settings
              </Link>
            </nav>

            {/* Theme + See All + logout */}
            <div className="px-3 py-3 border-t space-y-2">
              <div className="text-xs font-semibold text-muted-foreground px-1">Theme</div>
              <div className="flex gap-2 px-1">
                {themes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-3 py-1.5 rounded-full border text-sm ${currentTheme === t ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              
              <div className="text-xs font-semibold text-muted-foreground px-1">Visits</div>
              <button 
                onClick={() => setSeeAllVisits(!seeAllVisits)} 
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-muted"
              >
                {seeAllVisits ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                See All: {seeAllVisits ? 'On' : 'Off'}
              </button>
              
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-muted">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SideNav;
