import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { useUserVisits } from '@/hooks/useUserVisits';
import { useUsersForVisits } from '@/hooks/useUsersForVisits';
import { visitsCollection, ccisCollection } from '@/firebase/paths';
import useAuthStore from '../store/authStore';

interface VisitDoc {
  id: string;
  date: any;
  cci_id: string;
  cci_name: string;
  filledByUid: string;
  filledBy: 'EM' | 'Visitor';
  agenda?: string;
  debrief?: string;
  notes?: { id: string; text: string; createdAt: any }[];
  createdAt?: any;
  order?: number;
}

interface User {
  uid: string;
  email: string;
  username?: string;
  role: string;
}

interface CCI {
  id: string;
  name: string;
  city?: string;
  cohort?: string;
  status?: string;
}

const MonthCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [focusedDate, setFocusedDate] = useState(new Date());
  const [visibleMonths, setVisibleMonths] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const idTokenResult = await user.getIdTokenResult(true);
          const role = idTokenResult.claims.role as string;
          setIsAdmin(role === 'Admin');
        } catch (err) {
          console.error('Error checking admin status:', err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Fetch data based on admin status
  const { data: allVisitsAdmin } = useFirestoreCollection<VisitDoc>(visitsCollection());
  const { data: allVisitsUser } = useUserVisits<VisitDoc>(visitsCollection());
  const { data: allUsers } = useUsersForVisits();
  const { data: allCcis } = useFirestoreCollection<CCI>(ccisCollection());

  const allVisits = isAdmin ? allVisitsAdmin : allVisitsUser;

  // Generate months for dropdown
  const monthOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months = [];
    for (let year = currentYear - 2; year <= currentYear + 2; year++) {
      for (let month = 0; month < 12; month++) {
        months.push(new Date(year, month, 1));
      }
    }
    return months;
  }, []);

  // Initialize visible months
  useEffect(() => {
    const initialMonths = [];
    for (let i = -6; i <= 6; i++) {
      initialMonths.push(addMonths(currentDate, i));
    }
    setVisibleMonths(initialMonths);
  }, [currentDate]);

  // Intersection Observer for month focus tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const monthElement = entry.target as HTMLElement;
            const monthIndex = parseInt(monthElement.dataset.monthIndex || '0');
            if (monthIndex >= 0 && monthIndex < visibleMonths.length) {
              setFocusedDate(visibleMonths[monthIndex]);
            }
          }
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '-50% 0px -50% 0px', // Only trigger when month is in center 50% of viewport
        threshold: 0
      }
    );

    // Observe all month elements
    const monthElements = scrollContainerRef.current?.querySelectorAll('[data-month-index]');
    monthElements?.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [visibleMonths]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || loading) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const threshold = 200;
    
    // Load more months when scrolling near the top
    if (scrollTop < threshold) {
      setLoading(true);
      setTimeout(() => {
        setVisibleMonths(prev => {
          const firstMonth = prev[0];
          const newMonths = [];
          for (let i = 1; i <= 6; i++) {
            newMonths.push(subMonths(firstMonth, i));
          }
          return [...newMonths, ...prev];
        });
        setLoading(false);
      }, 100);
    }
    
    // Load more months when scrolling near the bottom
    if (scrollTop + clientHeight > scrollHeight - threshold) {
      setLoading(true);
      setTimeout(() => {
        setVisibleMonths(prev => {
          const lastMonth = prev[prev.length - 1];
          const newMonths = [];
          for (let i = 1; i <= 6; i++) {
            newMonths.push(addMonths(lastMonth, i));
          }
          return [...prev, ...newMonths];
        });
        setLoading(false);
      }, 100);
    }
  }, [loading]);

  // Group visits by date
  const visitsByDate = useMemo(() => {
    if (!allVisits) return {};
    
    const grouped: { [key: string]: VisitDoc[] } = {};
    
    allVisits.forEach(visit => {
      const visitDate = visit.date?.toDate ? visit.date.toDate() : new Date(visit.date);
      const dateKey = format(visitDate, 'yyyy-MM-dd');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(visit);
    });
    
    return grouped;
  }, [allVisits]);

  // Function to render a single month
  const renderMonth = (monthDate: Date) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
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
            className={`min-h-[70px] md:min-h-[80px] p-0.5 md:p-1 border border-gray-200 ${
              !isSameMonth(day, monthStart)
                ? 'text-gray-400 bg-gray-50'
                : isSameDay(day, new Date())
                ? 'bg-blue-100 text-blue-800 font-semibold'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <div className="text-xs md:text-sm font-medium mb-0.5 md:mb-1 px-1">
              {format(day, dateFormat)}
            </div>
            {/* Mini visit cards */}
            <div className="space-y-0.5 md:space-y-1">
              {dayVisits.slice(0, 3).map((visit) => (
                <div
                  key={visit.id}
                  className={`bg-white rounded-sm px-1 py-0.5 text-[9px] md:text-xs shadow-sm ${
                    visit.filledBy === 'EM' 
                      ? 'border-l-2 border-blue-500' 
                      : 'border-l-2 border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-[8px] md:text-[10px] leading-tight overflow-hidden">
                      {visit.cci_name}
                    </div>
                    {/* Show pill on desktop, hide on mobile */}
                    <span className={`hidden md:inline text-[7px] md:text-[8px] px-1 py-0.5 rounded-full border flex-shrink-0 ${
                      visit.filledBy === 'EM' 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}>
                      {visit.filledBy}
                    </span>
                  </div>
                </div>
              ))}
              {dayVisits.length > 3 && (
                <div className="text-[7px] md:text-[8px] text-gray-500 text-center px-1">
                  +{dayVisits.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div key={monthDate.toString()}>
        {/* Calendar days without headers or month titles */}
        {rows}
      </div>
    );
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-background flex flex-col modern-glass">
      <div className="flex-grow p-3 sm:p-4 pb-16 sm:pb-20">
        <div className="w-full max-w-4xl mx-auto">
          <Card className="home-card">
            <CardHeader className="px-4 sm:px-6 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <Select
                  value={format(focusedDate, 'yyyy-MM')}
                  onValueChange={(value) => {
                    const [year, month] = value.split('-').map(Number);
                    const newDate = new Date(year, month - 1, 1);
                    setCurrentDate(newDate);
                    setFocusedDate(newDate);
                  }}
                >
                  <SelectTrigger className="w-32 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={format(month, 'yyyy-MM')} value={format(month, 'yyyy-MM')}>
                        {format(month, 'MMM yyyy')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 rounded-full border-2 border-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                  asChild
                >
                  <Link to="/timeline">
                    <BarChart3 className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 rounded-full border-2 border-primary bg-primary text-primary-foreground"
                  asChild
                >
                  <Link to="/calendar">
                    <Calendar className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {/* Frozen day headers */}
              <div className="sticky top-0 z-10 bg-white border border-gray-200 rounded-t-lg overflow-hidden">
                <div className="grid grid-cols-7 bg-gray-100">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="p-1 md:p-2 text-center text-xs md:text-sm font-medium text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Infinite scroll container */}
              <div 
                ref={scrollContainerRef}
                className="max-h-[calc(100vh-250px)] overflow-y-auto border-l border-r border-b border-gray-200 rounded-b-lg"
                onScroll={handleScroll}
              >
                {visibleMonths.map(renderMonth)}
                {loading && (
                  <div className="text-center py-4 text-sm text-gray-500">
                    Loading more months...
                  </div>
                )}
              </div>

              {/* Legend below calendar */}
              <div className="flex items-center justify-center gap-4 text-[10px] text-gray-600 mt-4">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 border-l-2 border-blue-500"></div>
                  <span>EM</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 border-l-2 border-gray-400"></div>
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
