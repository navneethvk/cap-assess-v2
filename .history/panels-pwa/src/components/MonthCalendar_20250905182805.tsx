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

const MonthCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

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
      days.push(
        <div
          key={day.toString()}
          className={`min-h-[60px] p-2 border border-gray-200 ${
            !isSameMonth(day, monthStart)
              ? 'text-gray-400 bg-gray-50'
              : isSameDay(day, new Date())
              ? 'bg-blue-100 text-blue-800 font-semibold'
              : 'bg-white hover:bg-gray-50'
          }`}
        >
          <div className="text-sm font-medium">
            {format(day, dateFormat)}
          </div>
          {/* Placeholder for visit indicators */}
          <div className="mt-1 space-y-1">
            {/* This is where visit indicators would go */}
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
