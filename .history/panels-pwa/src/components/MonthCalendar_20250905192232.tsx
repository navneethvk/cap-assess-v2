import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
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
  city?: string;
  cohort?: string;
  status?: string;
}

const MonthCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const { user } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const token = await user.getIdTokenResult();
        setIsAdmin(token.claims.role === 'Admin');
      }
    };
    checkAdminStatus();
  }, [user]);

  // Always call both hooks to avoid conditional hook calls
  const { data: visitsRaw } = useFirestoreCollection<VisitDoc>(visitsCollection(), { revalidateOnFocus: false });
  const { data: userVisits } = useUserVisits();
  const { data: allUsers } = useUsersForVisits();
  const { data: ccis } = useFirestoreCollection(ccisCollection(), { revalidateOnFocus: false });

  // Use the appropriate data source based on admin status
  const allVisits = isAdmin ? visitsRaw : userVisits;

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

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

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
            className={`min-h-[70px] md:min-h-[80px] p-0.5 md:p-1 border border-gray-200 ${
              !isSameMonth(day, monthStart)
                ? 'text-gray-400 bg-gray-50'
                : isSameDay(day, new Date())
                ? 'bg-blue-100 text-blue-800 font-semibold'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <div className="text-xs md:text-sm font-medium mb-0.5 md:mb-1 px-1">
              {format(day, 'd')}
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

    return rows;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col modern-glass">
      <div className="flex-grow p-3 sm:p-4 pb-16 sm:pb-20">
        <div className="w-full max-w-4xl mx-auto">
          <Card className="home-card">
            {/* Unified Title Bar */}
            <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Select
                  value={format(currentDate, 'yyyy-MM')}
                  onValueChange={(value) => {
                    const [year, month] = value.split('-').map(Number);
                    setCurrentDate(new Date(year, month - 1, 1));
                  }}
                >
                  <SelectTrigger className="w-32 h-6 text-xs rounded-full px-3 border-gray-300 bg-white text-gray-900">
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
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs rounded-full border-gray-300 bg-white text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-1"
                  onClick={goToToday}
                >
                  <Calendar className="h-3 w-3" />
                  {format(new Date(), 'd')}
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <Link to="/timeline" className="text-gray-600 hover:text-gray-900 transition-colors">
                  <BarChart3 className="h-5 w-5" />
                </Link>
                <Link to="/calendar" className="text-gray-600 hover:text-gray-900 transition-colors">
                  <Calendar className="h-5 w-5" />
                </Link>
              </div>
            </div>

            {/* Desktop Navigation Arrows */}
            <div className="hidden md:flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousMonth}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium text-gray-700">
                {format(currentDate, 'MMMM yyyy')}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextMonth}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <CardContent className="px-3 sm:px-4 pt-0">
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
              
              {/* Calendar Grid with Touch Support */}
              <div 
                className="border-l border-r border-b border-gray-200 rounded-b-lg overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {renderMonth()}
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