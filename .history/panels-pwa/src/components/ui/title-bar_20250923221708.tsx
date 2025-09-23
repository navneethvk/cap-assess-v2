import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import * as SelectPrimitive from '@radix-ui/react-select';
import { BarChart3, Calendar, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths } from 'date-fns';
import SideNav from '@/components/SideNav';

interface TitleBarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onTodayClick: () => void;
  // Optional custom slots: when provided, the bar renders only these
  customLeft?: React.ReactNode;
  customCenter?: React.ReactNode;
  customRight?: React.ReactNode;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  currentDate,
  onDateChange,
  onTodayClick,
  customLeft,
  customCenter,
  customRight,
}) => {
  const [navOpen, setNavOpen] = useState(false);
  const today = new Date();
  const navigate = useNavigate();

  // Generate month options for dropdown
  const monthOptions = useMemo(() => {
    const options = [];
    const currentYear = new Date().getFullYear();
    
    for (let year = currentYear - 2; year <= currentYear + 2; year++) {
      for (let month = 0; month < 12; month++) {
        options.push(new Date(year, month, 1));
      }
    }
    
    return options;
  }, []);

  // Keyboard navigation for months on desktop: Left/Right arrows
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable = target?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (isEditable) return;
      if (e.key === 'ArrowLeft') {
        onDateChange(subMonths(currentDate, 1));
      } else if (e.key === 'ArrowRight') {
        onDateChange(addMonths(currentDate, 1));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentDate, onDateChange]);

  const isCustom = !!( (customLeft) || (customCenter) || (customRight) );

  if (isCustom) {
    return (
      <div className="title-bar bg-muted/50 border-b border-border py-1.5 flex items-center justify-between gap-2 px-2">
        {/* Left: Nav control (mobile back / desktop hamburger) + optional slot */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          {/* Mobile universal back */}
          <button
            aria-label="Back"
            onClick={() => navigate(-1)}
            className="md:hidden h-7 w-7 rounded-md border flex items-center justify-center hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {/* Desktop hamburger */}
          <button
            aria-label="Open menu"
            onClick={() => setNavOpen(true)}
            className="hidden md:inline-flex h-7 w-7 items-center justify-center rounded-md border hover:bg-muted"
          >
            <Menu className="h-4 w-4" />
          </button>
          {/* Page-provided left slot */}
          {customLeft}
        </div>
        {/* Center slot */}
        <div className="flex items-center justify-center min-w-0 flex-1 px-2">
          {customCenter}
        </div>
        {/* Right slot */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          {customRight}
        </div>
        {/* Side drawer mounted here */}
        <SideNav open={navOpen} onOpenChange={setNavOpen} />
      </div>
    );
  }

  return (
    <div className="title-bar bg-muted/50 border-b border-border py-1.5 grid grid-cols-3 items-center">
      {/* Left: Hamburger + Today */}
      <div className="flex items-center gap-3 justify-self-start">
        {/* Desktop hamburger trigger */}
        <button
          aria-label="Open menu"
          onClick={() => setNavOpen(true)}
          className="hidden md:inline-flex h-7 w-7 items-center justify-center rounded-md border hover:bg-muted"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs bg-transparent border-none text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          onClick={onTodayClick}
        >
          <Calendar className="h-3 w-3" />
          {format(today, 'd')}
        </Button>
      </div>

      {/* Center: Month dropdown with previous/next arrows */}
      <div className="justify-self-center">
        <Select
          value={format(currentDate, 'yyyy-MM')}
          onValueChange={(value) => {
            const [year, month] = value.split('-').map(Number);
            const newDate = new Date(year, month - 1, 1);
            onDateChange(newDate);
          }}
        >
          {/* Composite trigger row: prev button, label, next button */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="hidden md:inline-flex h-8 w-8 p-0 text-gray-600 hover:text-gray-900"
              type="button"
              onClick={() => onDateChange(subMonths(currentDate, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <SelectPrimitive.Trigger className="w-28 sm:w-32 md:w-40 h-6 text-xs bg-transparent border-none text-foreground hover:text-foreground transition-colors px-1 flex items-center justify-center outline-none focus:outline-none">
              <SelectValue />
            </SelectPrimitive.Trigger>
            <Button
              size="sm"
              variant="ghost"
              className="hidden md:inline-flex h-8 w-8 p-0 text-gray-600 hover:text-gray-900"
              type="button"
              onClick={() => onDateChange(addMonths(currentDate, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
          <SelectContent>
            {monthOptions.map((month) => (
              <SelectItem key={format(month, 'yyyy-MM')} value={format(month, 'yyyy-MM')}>
                {format(month, 'MMM yyyy')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Right: View icons */}
      <div className="flex items-center gap-4 justify-self-end">
        <Link to="/timeline" className="text-gray-600 hover:text-gray-900 transition-colors">
          <BarChart3 className="h-5 w-5" />
        </Link>
        <Link to="/calendar" className="text-gray-600 hover:text-gray-900 transition-colors">
          <Calendar className="h-5 w-5" />
        </Link>
      </div>
      {/* Side drawer mounted here */}
      <SideNav open={navOpen} onOpenChange={setNavOpen} />
    </div>
  );
};
