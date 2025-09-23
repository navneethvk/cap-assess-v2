import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DateCarousel } from './ui/date-carousel';
import VisitsTimeline from './VisitsTimeline';
import { useSelectedDateStore } from '@/store/selectedDate';

const Home: React.FC = () => {
  const { selectedDate, setSelectedDate } = useSelectedDateStore();

  return (
    <div className="min-h-screen bg-background flex flex-col modern-glass">
      <div className="flex-grow p-0 pb-16 sm:pb-20 md:pb-0">
        <div className="w-full max-w-none mx-0">
          <Card className="home-card">
            <CardContent className="space-y-4 sm:space-y-6 lg:space-y-8 px-0 pt-0">
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
