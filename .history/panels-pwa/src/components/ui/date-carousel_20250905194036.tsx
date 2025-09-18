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


  // Scroll to center the selected date with dynamic animation speed
  useEffect(() => {
    if (scrollerRef.current && visibleDays.length > 0) {
      const selectedIndex = visibleDays.findIndex(day => isSameDay(day, selectedDate));
      if (selectedIndex !== -1) {
        setTimeout(() => {
          const scroller = scrollerRef.current;
          if (scroller) {
            // Find the actual DOM element for the selected date
            const selectedElement = scroller.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
              // Get the element's position relative to the scroller
              const elementRect = selectedElement.getBoundingClientRect();
              const scrollerRect = scroller.getBoundingClientRect();
              
              // Calculate element center position relative to scroller viewport
              const elementCenter = elementRect.left - scrollerRect.left + elementRect.width / 2;
              const scrollerCenter = scroller.clientWidth / 2;
              
              // Calculate the distance to center
              const distanceToCenter = Math.abs(elementCenter - scrollerCenter);
              
              // If element is already centered (within 20px), don't scroll
              if (distanceToCenter < 20) {
                return; // No scrolling needed
              }
              
              // Calculate scroll position to center the element
              const scrollPosition = scroller.scrollLeft + elementCenter - scrollerCenter;
              
              // Calculate dynamic duration based on distance (closer = slower)
              // Base duration of 300ms, scale with distance for consistent visual speed
              const baseDuration = 300;
              const maxDistance = scroller.clientWidth; // Maximum possible distance
              const normalizedDistance = Math.min(distanceToCenter / maxDistance, 1);
              const duration = baseDuration + (normalizedDistance * 200); // 300-500ms range
              
              // Use CSS transition for smooth, consistent animation
              scroller.style.transition = `scroll-left ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
              scroller.scrollLeft = Math.max(0, scrollPosition);
              
              // Remove transition after animation completes
              setTimeout(() => {
                scroller.style.transition = '';
              }, duration);
            }
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