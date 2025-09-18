import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateCarousel } from './ui/date-carousel';
import VisitsTimeline from './VisitsTimeline';
import { Button } from '@/components/ui/button';
import { BarChart3, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {

  return (
    <div className="min-h-screen bg-background flex flex-col modern-glass">
      <div className="flex-grow p-3 sm:p-4 pb-16 sm:pb-20">
        <div className="w-full max-w-4xl mx-auto">
          <Card className="home-card">
            <CardHeader className="px-4 sm:px-6 flex flex-row items-center justify-between">
              <CardTitle className="modern-gradient-text text-xl sm:text-2xl">Timeline</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 rounded-full border-2 border-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                  asChild
                >
                  <Link to="/timeline">
                    <BarChart3 className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 rounded-full border-2 border-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                  asChild
                >
                  <Link to="/calendar">
                    <Calendar className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
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
