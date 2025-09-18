import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DateCarousel } from './ui/date-carousel';
import { TitleBar } from './ui/title-bar';
import VisitsTimeline from './VisitsTimeline';
import { useSelectedDateStore } from '@/store/selectedDate';

const Home: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { selectedDate, setSelectedDate } = useSelectedDateStore();

  // Sync currentDate with selectedDate from store
  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(selectedDate);
    }
  }, [selectedDate]);

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
    setSelectedDate(date);
  };

  const handleTodayClick = () => {
    const todayDate = new Date();
    setCurrentDate(todayDate);
    setSelectedDate(todayDate);
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
                    const newDate = new Date(year, month - 1, 1);
                    setCurrentDate(newDate);
                    setSelectedDate(newDate);
                  }}
                >
                  <SelectTrigger className="w-20 h-6 text-xs bg-transparent border-none text-gray-600 hover:text-gray-900 transition-colors px-1">
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
                  variant="ghost"
                  className="h-6 px-2 text-xs bg-transparent border-none text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                  onClick={() => {
                    const todayDate = new Date();
                    setCurrentDate(todayDate);
                    setSelectedDate(todayDate);
                  }}
                >
                  <Calendar className="h-3 w-3" />
                  {format(today, 'd')}
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
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pt-0">
              <DateCarousel />
              <VisitsTimeline />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;
