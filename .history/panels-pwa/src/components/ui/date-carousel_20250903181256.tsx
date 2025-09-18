import React, { useMemo, useRef, useEffect } from 'react';
import { useSelectedDateStore } from '@/store/selectedDate';
import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isToday,
  isSameDay,

  getYear,
  setYear,
  getMonth,
  setMonth,
} from 'date-fns';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';


export const DateCarousel: React.FC = () => {
  const { selectedDate, setSelectedDate } = useSelectedDateStore();
  const scrollerRef = useRef<HTMLDivElement>(null);

  const currentMonth = startOfMonth(selectedDate);
  const days = eachDayOfInterval({
    start: currentMonth,
    end: endOfMonth(currentMonth),
  });

  const years = useMemo(() => {
    const currentYear = getYear(new Date());
    return Array.from({ length: 3 }, (_, i) => currentYear - 1 + i);
  }, []);

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: format(new Date(getYear(selectedDate), i), 'MMMM'),
    }));
  }, [selectedDate]);

  const handleYearChange = (yearValue: string) => {
    const newDate = setYear(selectedDate, parseInt(yearValue, 10));
    setSelectedDate(newDate);
  };

  const handleMonthChange = (monthValue: string) => {
    const newDate = setMonth(selectedDate, parseInt(monthValue, 10));
    setSelectedDate(newDate);
  };



  const goToToday = () => {
    setSelectedDate(new Date());
  };

  useEffect(() => {
    if (scrollerRef.current) {
      const selectedDayElement = scrollerRef.current.querySelector<HTMLDivElement>('[data-selected="true"]');
      if (selectedDayElement) {
        const scrollerWidth = scrollerRef.current.offsetWidth;
        const selectedLeft = selectedDayElement.offsetLeft;
        const selectedWidth = selectedDayElement.offsetWidth;
        scrollerRef.current.scrollLeft = selectedLeft - scrollerWidth / 2 + selectedWidth / 2;
      }
    }
  }, [selectedDate]);

  return (
    <div className="w-full">
      <div className="flex justify-center items-center mb-2 px-2">
        <div className="flex items-center gap-3">
          <Select value={String(getYear(selectedDate))} onValueChange={handleYearChange}>
            <SelectTrigger className="w-28 rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(getMonth(selectedDate))} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-36 rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={String(month.value)}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant={isToday(selectedDate) ? "default" : "outline"} 
            size="sm" 
            onClick={goToToday} 
            className={`rounded-full ${isToday(selectedDate) ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
          >
            Today
          </Button>
        </div>
      </div>
      <div ref={scrollerRef} className="flex overflow-x-auto space-x-2 pb-2">
        {days.map((day) => (
          <div
            key={day.toString()}
            data-selected={isSameDay(day, selectedDate)}
            onClick={() => setSelectedDate(day)}
            className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-16 rounded-lg cursor-pointer transition-colors data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground"
          >
            <div className="text-xs">{format(day, 'EEE')}</div>
            <div className="text-lg font-semibold">{format(day, 'd')}</div>
          </div>
        ))}
      </div>
    </div>
  );
};