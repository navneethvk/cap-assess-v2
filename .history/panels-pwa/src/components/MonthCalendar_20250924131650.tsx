import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { useVisitsInRange } from '@/hooks/useVisitQueries';
import { useTitleBarSlots } from '@/store/titleBarSlots';
import { Button } from '@/components/ui/button';
import { Calendar, Home, BarChart3 } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { PillSelector, PillOption } from '@/components/ui/pill-selector';

import type { VisitDoc, DocumentWithId } from '@/types/firestore'

const MonthCalendar: React.FC = () => {
  const navigate = useNavigate();
  const { setSlots, clearSlots } = useTitleBarSlots();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [maxVisiblePerDay, setMaxVisiblePerDay] = useState(3);
  // const { user } = useAuthStore();
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const [gridHeight, setGridHeight] = useState<number>(0);

  // Robust Firestore Timestamp -> Date conversion
  const firestoreTimestampToDate = (timestamp: any): Date | null => {
    try {
      if (!timestamp) return null;
      if (timestamp && typeof timestamp === 'object' && typeof timestamp.toDate === 'function') {
        const d = timestamp.toDate();
        return isNaN(d.getTime()) ? null : d;
      }
      if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
        const seconds = (timestamp as any).seconds;
        const nanos = (timestamp as any).nanoseconds || (timestamp as any)._nanoseconds || 0;
        const d = new Date(seconds * 1000 + nanos / 1_000_000);
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(timestamp);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };


  const monthRange = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const start = startOfWeek(monthStart)
    const end = endOfWeek(monthEnd)
    start.setHours(0,0,0,0)
    end.setHours(23,59,59,999)
    return { start, end }
  }, [currentDate])

  // Centralized query system automatically handles permissions
  const { visits: visitsInRange, isLoading, error } = useVisitsInRange(monthRange.start, monthRange.end, {
    limit: 2000,
  })

  // Touch handlers for mobile swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      // Swipe left - go to next month
      setCurrentDate(addMonths(currentDate, 1));
    }
    if (isRightSwipe) {
      // Swipe right - go to previous month
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  // Measure available viewport height for the month grid and set it so rows fill the screen
  useEffect(() => {
    const calc = () => {
      const el = gridWrapRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      // Reserve some space for legend + bottom nav on mobile
      const reserve = window.innerWidth < 768 ? 120 : 56; // px
      const h = Math.max(320, window.innerHeight - top - reserve);
      setGridHeight(h);
    };
    calc();
    window.addEventListener('resize', calc);
    window.addEventListener('orientationchange', calc);
    return () => {
      window.removeEventListener('resize', calc);
      window.removeEventListener('orientationchange', calc);
    };
  }, []);

  // Determine how many visit pills to show per day based on viewport height
  useEffect(() => {
    const calc = () => {
      const h = window.innerHeight;
      let n = 3;
      if (h >= 680) n = 4;
      if (h >= 780) n = 5;
      if (h >= 900) n = 6;
      if (h >= 1040) n = 7;
      if (h >= 1200) n = 8;
      setMaxVisiblePerDay(n);
    };
    calc();
    window.addEventListener('resize', calc);
    window.addEventListener('orientationchange', calc);
    return () => {
      window.removeEventListener('resize', calc);
      window.removeEventListener('orientationchange', calc);
    };
  }, []);

  // Navigation functions


  // Group visits by date (only those in the currently visible month range)
  const visitsByDate = useMemo(() => {
    const grouped: { [key: string]: DocumentWithId<VisitDoc>[] } = {}
    visitsInRange.forEach((visit: VisitDoc) => {
      const d = firestoreTimestampToDate((visit as any).date)
      if (!d) return
      const key = format(d, 'yyyy-MM-dd')
      ;(grouped[key] ||= []).push(visit)
    })
    return grouped
  }, [visitsInRange])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        Loading calendar…
      </div>
    )
  }

  if (error && !isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-destructive">
        Failed to load calendar: {String(error)}
      </div>
    )
  }

  // Render single month calendar
  const renderMonth = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayVisits = visitsByDate[dateKey] || [];
        
        days.push(
          <div
            key={day.toString()}
            className={`h-full p-0.5 md:p-1 border border-border ${
              !isSameMonth(day, monthStart)
                ? 'text-muted-foreground bg-muted/30'
                : isSameDay(day, new Date())
                ? 'bg-primary/10 text-primary font-semibold'
                : 'bg-card hover:bg-accent/50'
            }`}
          >
            <div className="text-xs md:text-sm font-medium mb-0.5 md:mb-1 px-1">
              {format(day, 'd')}
            </div>
            {/* Mini visit cards */}
            <div className="space-y-0.5 md:space-y-1">
              {dayVisits.slice(0, maxVisiblePerDay).map((visit) => (
                <div
                  key={visit.id}
                  className={`bg-card rounded-sm px-1 py-0.5 text-[9px] md:text-xs shadow-sm cursor-pointer hover:shadow-md transition-shadow border border-border ${
                    visit.filledBy === 'EM' 
                      ? 'border-l-2 border-l-primary' 
                      : 'border-l-2 border-l-muted-foreground'
                  }`}
                  onClick={() => navigate(`/meeting-notes/${visit.id}?mode=view`)}
                  title={`Click to view ${visit.cci_name} meeting notes`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-[8px] md:text-[10px] leading-tight overflow-hidden">
                      {visit.cci_name}
                    </div>
                    {/* Show pill on desktop, hide on mobile */}
                    <span className={`hidden md:inline text-[7px] md:text-[8px] px-1 py-0.5 rounded-full border flex-shrink-0 ${
                      visit.filledBy === 'EM' 
                        ? 'bg-primary/10 text-primary border-primary/20' 
                        : 'bg-muted text-muted-foreground border-border'
                    }`}>
                      {visit.filledBy}
                    </span>
                  </div>
                </div>
              ))}
              {dayVisits.length > maxVisiblePerDay && (
                <div className="text-[7px] md:text-[8px] text-muted-foreground text-center px-1">
                  +{dayVisits.length - maxVisiblePerDay} more
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 h-full">
          {days}
        </div>
      );
      days = [];
    }

    // Parent grid with equal-height week rows that fill available height
    const weekCount = rows.length;
    const templateRows = `repeat(${weekCount}, 1fr)`;
    const finalHeight = gridHeight ? Math.floor(gridHeight / weekCount) * weekCount : undefined;
    return (
      <div
        ref={gridWrapRef}
        style={{ height: finalHeight, gridTemplateRows: templateRows }}
        className="grid overflow-hidden"
      >
        {rows}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col modern-glass">
      <div className="flex-grow p-0 pb-16 sm:pb-20 md:pb-0">
        <div className="w-full max-w-none mx-0">
          <Card className="home-card">

            {/* Month navigation handled by TitleBar; redundant header removed */}

            <CardContent className="px-0 pt-0">
              {/* Frozen day headers - matching title bar style */}
              <div className="sticky top-0 z-10 bg-muted/50 border-b border-border px-0 py-1.5">
                <div className="flex items-center justify-between">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="flex-1 text-center text-xs font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Calendar Grid with Touch Support */}
              <div 
                className="border-l border-r border-b border-border rounded-b-lg overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {renderMonth()}
              </div>

              {/* Legend below calendar */}
              <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground mt-4">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 border-l-2 border-primary"></div>
                  <span>EM</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 border-l-2 border-muted-foreground"></div>
                  <span>Visitor</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MonthCalendar;
