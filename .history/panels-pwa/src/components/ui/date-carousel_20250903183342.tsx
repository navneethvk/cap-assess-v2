import React, { useMemo, useRef, useEffect } from 'react';
import { useSelectedDateStore } from '@/store/selectedDate';
import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
  getYear,
  setYear,
  getMonth,
  setMonth,
  addDays,
  subDays,
} from 'date-fns';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const DateCarousel: React.FC = () => {
  const { selectedDate, setSelectedDate } = useSelectedDateStore();
  const scrollerRef = useRef<HTMLDivElement>(null);

  const currentMonth = startOfMonth(selectedDate);
  const days = eachDayOfInterval({
    start: currentMonth,
    end: endOfMonth(currentMonth),
  });

  // Create extended date range for better scrolling and centering
  const extendedDays = useMemo(() => {
    const startDate = subDays(currentMonth, 15); // 15 days before month start
    const endDate = addDays(endOfMonth(currentMonth), 15); // 15 days after month end
    
    return eachDayOfInterval({
      start: startDate,
      end: endDate,
    });
  }, [currentMonth]);

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

  const goToPreviousMonth = () => {
    setSelectedDate(subMonths(selectedDate, 1));
  };

  const goToNextMonth = () => {
    setSelectedDate(addMonths(selectedDate, 1));
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
      <div className="flex justify-between items-center mb-2 px-2">
        <div className="flex items-center gap-2">
          <Select value={String(getYear(selectedDate))} onValueChange={handleYearChange}>
            <SelectTrigger className="w-28">
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
            <SelectTrigger className="w-36">
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
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday} className={isToday(selectedDate) ? 'bg-accent' : ''}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div ref={scrollerRef} className="flex overflow-x-auto space-x-2 pb-2">
        {extendedDays.map((day) => (
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