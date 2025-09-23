import React from 'react';
import { TitleBar } from './ui/title-bar';
import { useSelectedDateStore } from '@/store/selectedDate';
import { useTitleBarSlots } from '@/store/titleBarSlots';

const GlobalTitleBar: React.FC = () => {
  const { selectedDate, setSelectedDate } = useSelectedDateStore();
  const { customLeft, customCenter, customRight } = useTitleBarSlots();

  return (
    <TitleBar
      currentDate={selectedDate}
      onDateChange={(d) => setSelectedDate(d)}
      onTodayClick={() => setSelectedDate(new Date())}
      customLeft={customLeft}
      customCenter={customCenter}
      customRight={customRight}
    />
  );
};

export default GlobalTitleBar;


