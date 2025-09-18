import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSelectedDateStore } from '@/store/selectedDate';
import {
  format,
  eachDayOfInterval,
  isSameDay,
  addDays,
  subDays,
} from 'date-fns';

export const DateCarousel: React.FC = () => {
  const { selectedDate, setSelectedDate } = useSelectedDateStore();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [visibleDays, setVisibleDays] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate initial visible days (current month + some buffer)
  const generateVisibleDays = useCallback((centerDate: Date, count: number = 60) => {
    const halfCount = Math.floor(count / 2);
    const startDate = subDays(centerDate, halfCount);
    const endDate = addDays(centerDate, halfCount);
    
    return eachDayOfInterval({
      start: startDate,
      end: endDate,
    });
  }, []);

  // Load more days when scrolling
  const loadMoreDays = useCallback((direction: 'left' | 'right') => {
    if (loading) return;
    
    setLoading(true);
    
    setTimeout(() => {
      setVisibleDays(prevDays => {
        if (direction === 'left') {
          // Add more days to the left
          const firstDay = prevDays[0];
          const newStartDate = subDays(firstDay, 30);
          const newDays = eachDayOfInterval({
            start: newStartDate,
            end: subDays(firstDay, 1),
          });
          return [...newDays, ...prevDays];
        } else {
          // Add more days to the right
          const lastDay = prevDays[prevDays.length - 1];
          const newEndDate = addDays(lastDay, 30);
          const newDays = eachDayOfInterval({
            start: addDays(lastDay, 1),
            end: newEndDate,
          });
          return [...prevDays, ...newDays];
        }
      });
      setLoading(false);
    }, 100);
  }, [loading]);

  // Initialize visible days
  useEffect(() => {
    setVisibleDays(generateVisibleDays(selectedDate));
  }, [selectedDate, generateVisibleDays]);

  // Handle scroll to detect when we need to load more content
  const handleScroll = useCallback(() => {
    if (!scrollerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollerRef.current;
    
    // Load more days when scrolling near the left edge
    if (scrollLeft < 100) {
      loadMoreDays('left');
    }
    
    // Load more days when scrolling near the right edge
    if (scrollLeft + clientWidth > scrollWidth - 100) {
      loadMoreDays('right');
    }
  }, [loadMoreDays]);

  // Add scroll event listener
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) {
      scroller.addEventListener('scroll', handleScroll);
      return () => scroller.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);


  // Center the selected date in the scroller
  useEffect(() => {
    if (scrollerRef.current && visibleDays.length > 0) {
      const selectedIndex = visibleDays.findIndex(day => isSameDay(day, selectedDate));
      if (selectedIndex !== -1) {
        setTimeout(() => {
          const scroller = scrollerRef.current;
          if (scroller) {
            const dayWidth = 56; // w-12 + space-x-2 = 48px + 8px
            const scrollPosition = selectedIndex * dayWidth - scroller.clientWidth / 2 + dayWidth / 2;
            scroller.scrollTo({
              left: Math.max(0, scrollPosition),
              behavior: 'smooth'
            });
          }
        }, 100);
      }
    }
  }, [selectedDate, visibleDays]);

  return (
    <div className="w-full bg-gray-50 border-b border-gray-200">
      <div ref={scrollerRef} className="flex overflow-x-auto space-x-1 px-2 py-2">
        {visibleDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          
          return (
            <div
              key={day.toString()}
              data-selected={isSelected}
              onClick={() => setSelectedDate(day)}
              style={{
                backgroundColor: isSelected ? 'hsl(var(--primary))' : undefined,
                color: isSelected ? 'hsl(var(--primary-foreground))' : undefined,
                boxShadow: isSelected ? '0 2px 4px -1px rgb(0 0 0 / 0.1)' : undefined,
              }}
              className="flex-shrink-0 flex flex-col items-center justify-center w-10 h-10 rounded cursor-pointer transition-colors hover:bg-gray-200"
            >
              <div className="text-[10px]">{format(day, 'EEE')}</div>
              <div className="text-sm font-semibold">{format(day, 'd')}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};