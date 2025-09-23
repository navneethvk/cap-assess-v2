import React from 'react';
import { TitleBar } from './ui/title-bar';
import { useSelectedDateStore } from '@/store/selectedDate';

const GlobalTitleBar: React.FC = () => {
  const { selectedDate, setSelectedDate } = useSelectedDateStore();

  return (
    <TitleBar
      currentDate={selectedDate}
      onDateChange={(d) => setSelectedDate(d)}
      onTodayClick={() => setSelectedDate(new Date())}
    />
  );
};

export default GlobalTitleBar;


