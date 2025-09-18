import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, BarChart3, Calendar } from 'lucide-react';
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

  const monthStart = startOfMonth(currentDate);
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
          className={`min-h-[80px] p-1 border border-gray-200 ${
            !isSameMonth(day, monthStart)
              ? 'text-gray-400 bg-gray-50'
              : isSameDay(day, new Date())
              ? 'bg-blue-100 text-blue-800 font-semibold'
              : 'bg-white hover:bg-gray-50'
          }`}
        >
          <div className="text-sm font-medium mb-1">
            {format(day, dateFormat)}
          </div>
          {/* Mini visit cards */}
          <div className="space-y-1">
            {dayVisits.slice(0, 3).map((visit) => (
              <div
                key={visit.id}
                className="bg-white border border-gray-200 rounded px-1 py-0.5 text-xs shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="truncate flex-1 mr-1">
                    {visit.cci_name}
                  </div>
                  <span className={`text-[8px] px-1 py-0.5 rounded-full border flex-shrink-0 ${
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
              <div className="text-[8px] text-gray-500 text-center">
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

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-background flex flex-col modern-glass">
      <div className="flex-grow p-3 sm:p-4 pb-16 sm:pb-20">
        <div className="w-full max-w-4xl mx-auto">
          <Card className="home-card">
            <CardHeader className="px-4 sm:px-6 flex flex-row items-center justify-between">
              <CardTitle className="modern-gradient-text text-xl sm:text-2xl">Month View</CardTitle>
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
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
              {/* Month Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Legend for mobile */}
              <div className="md:hidden flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 border-2 border-blue-500 rounded"></div>
                  <span>EM</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 border-2 border-gray-400 rounded"></div>
                  <span>Visitor</span>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Week day headers */}
                <div className="grid grid-cols-7 bg-gray-100">
                  {weekDays.map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>
                {/* Calendar days */}
                {rows}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MonthCalendar;
