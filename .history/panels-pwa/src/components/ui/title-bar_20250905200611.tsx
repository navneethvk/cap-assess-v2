import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface TitleBarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onTodayClick: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  currentDate,
  onDateChange,
  onTodayClick,
}) => {
  const today = new Date();

  // Generate month options for dropdown
  const monthOptions = useMemo(() => {
    const options = [];
    const currentYear = new Date().getFullYear();
    
    for (let year = currentYear - 2; year <= currentYear + 2; year++) {
      for (let month = 0; month < 12; month++) {
        options.push(new Date(year, month, 1));
      }
    }
    
    return options;
  }, []);

  return (
    <div className="bg-gray-100 border-b border-gray-200 px-4 py-1.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Select
          value={format(currentDate, 'yyyy-MM')}
          onValueChange={(value) => {
            const [year, month] = value.split('-').map(Number);
            const newDate = new Date(year, month - 1, 1);
            onDateChange(newDate);
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
          onClick={onTodayClick}
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
  );
};
