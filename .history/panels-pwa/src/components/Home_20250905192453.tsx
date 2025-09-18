import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import VisitsTimeline from './VisitsTimeline';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const Home: React.FC = () => {

  return (
    <div className="min-h-screen bg-background flex flex-col modern-glass">
      <div className="flex-grow p-3 sm:p-4 pb-16 sm:pb-20">
        <div className="w-full max-w-4xl mx-auto">
          <Card className="home-card">
            {/* Unified Title Bar */}
            <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-gray-700">
                  Timeline
                </div>
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
