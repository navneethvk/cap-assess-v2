import React, { useState, useRef, useCallback } from 'react';
import { Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PinButtonProps {
  isPinned: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export const PinButton: React.FC<PinButtonProps> = ({ isPinned, onToggle, className = '' }) => {
  const [showPinIcon, setShowPinIcon] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressing = useRef(false);

  const handleMouseDown = useCallback(() => {
    isLongPressing.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPressing.current = true;
      setShowPinIcon(true);
    }, 500); // 500ms for long press
  }, []);

  const handleMouseUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (isLongPressing.current) {
      onToggle();
    }
    
    setShowPinIcon(false);
    isLongPressing.current = false;
  }, [onToggle]);

  const handleMouseLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setShowPinIcon(false);
    isLongPressing.current = false;
  }, []);

  // Touch events for mobile
  const handleTouchStart = useCallback(() => {
    isLongPressing.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPressing.current = true;
      setShowPinIcon(true);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (isLongPressing.current) {
      onToggle();
    }
    
    setShowPinIcon(false);
    isLongPressing.current = false;
  }, [onToggle]);

  const handleTouchCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setShowPinIcon(false);
    isLongPressing.current = false;
  }, []);

  return (
    <div
      className={`relative ${className}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* Pin icon overlay that appears during long press */}
      {showPinIcon && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20 rounded-md z-10">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 bg-blue-500 text-white hover:bg-blue-600"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
              setShowPinIcon(false);
            }}
          >
            {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </Button>
        </div>
      )}
      
      {/* Visual indicator for pinned state */}
      {isPinned && (
        <div className="absolute top-1 right-1 z-5">
          <Pin className="h-3 w-3 text-blue-500 fill-blue-500" />
        </div>
      )}
    </div>
  );
};

export default PinButton;
