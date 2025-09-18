import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import VisitsTimeline from './VisitsTimeline';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const Home: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
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
    <div className="min-h-screen bg-background flex flex-col modern-glass">
      <div className="flex-grow p-3 sm:p-4 pb-16 sm:pb-20">
        <div className="w-full max-w-4xl mx-auto">
          <Card className="home-card">
            {/* Unified Title Bar */}
            <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Select
                  value={format(currentDate, 'yyyy-MM')}
                  onValueChange={(value) => {
                    const [year, month] = value.split('-').map(Number);
                    setCurrentDate(new Date(year, month - 1, 1));
                  }}
                >
                  <SelectTrigger className="w-32 h-6 text-xs rounded-full px-3 border-gray-300 bg-white text-gray-900">
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
                  variant="outline"
                  className="h-6 px-2 text-xs rounded-full border-gray-300 bg-white text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-1"
                  onClick={() => setCurrentDate(new Date())}
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
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pt-0">
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
