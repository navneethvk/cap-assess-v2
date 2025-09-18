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
      <div className="flex-grow p-3 sm:p-4 lg:p-6 xl:p-8 pb-16 sm:pb-20">
        <div className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto">
          <Card className="home-card">
            <TitleBar
              currentDate={currentDate}
              onDateChange={handleDateChange}
              onTodayClick={handleTodayClick}
            />
            <CardContent className="space-y-4 sm:space-y-6 lg:space-y-8 px-4 sm:px-6 lg:px-8 xl:px-12 pt-0">
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
