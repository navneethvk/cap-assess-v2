/**
 * Example usage of the centralized Visit Query System
 * 
 * This file demonstrates how to use the new centralized query system
 * for various visit-related data fetching scenarios.
 */

import React from 'react';
import { 
  useVisitsInRange, 
  useUserVisits, 
  useVisitsForDate, 
  useAllVisits,
  useVisitsByCCI,
  useVisitsByStatus,
  usePaginatedVisits,
  usePreloadVisits,
  useVisitCache
} from '@/hooks/useVisitQueries';

// Example 1: Basic date range query (like NotesView)
export const NotesViewExample: React.FC = () => {
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-01-31');
  
  const { visits, isLoading, error, refetch } = useVisitsInRange(startDate, endDate);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h2>Visits in Range ({visits.length})</h2>
      <button onClick={refetch}>Refresh</button>
      {visits.map((visit: any) => (
        <div key={visit.id}>
          {visit.cci_name} - {visit.date?.toString()}
        </div>
      ))}
    </div>
  );
};

// Example 2: User-specific visits
export const UserVisitsExample: React.FC = () => {
  const { visits, isLoading } = useUserVisits({
    limit: 100,
    orderBy: 'date',
    orderDirection: 'desc'
  });
  
  if (isLoading) return <div>Loading user visits...</div>;
  
  return (
    <div>
      <h2>My Visits ({visits.length})</h2>
      {visits.map((visit: any) => (
        <div key={visit.id}>
          {visit.cci_name} - {visit.status}
        </div>
      ))}
    </div>
  );
};

// Example 3: Visits for a specific date (like DayView)
export const DayViewExample: React.FC = () => {
  const selectedDate = new Date();
  
  const { visits, isLoading } = useVisitsForDate(selectedDate);
  
  if (isLoading) return <div>Loading day visits...</div>;
  
  return (
    <div>
      <h2>Visits for {selectedDate.toDateString()} ({visits.length})</h2>
      {visits.map((visit: any) => (
        <div key={visit.id}>
          {visit.cci_name} - {visit.agenda}
        </div>
      ))}
    </div>
  );
};

// Example 4: Admin view - all visits
export const AdminVisitsExample: React.FC = () => {
  const { visits, isLoading } = useAllVisits({
    limit: 500,
    orderBy: 'date',
    orderDirection: 'desc'
  });
  
  if (isLoading) return <div>Loading all visits...</div>;
  
  return (
    <div>
      <h2>All Visits ({visits.length})</h2>
      {visits.map((visit: any) => (
        <div key={visit.id}>
          {visit.cci_name} - {visit.filledBy} - {visit.status}
        </div>
      ))}
    </div>
  );
};

// Example 5: CCI-specific visits
export const CCIVisitsExample: React.FC<{ cciId: string }> = ({ cciId }) => {
  const { visits, isLoading } = useVisitsByCCI(cciId, {
    limit: 100,
    orderBy: 'date',
    orderDirection: 'desc'
  });
  
  if (isLoading) return <div>Loading CCI visits...</div>;
  
  return (
    <div>
      <h2>Visits for CCI {cciId} ({visits.length})</h2>
      {visits.map((visit: any) => (
        <div key={visit.id}>
          {visit.date?.toString()} - {visit.status}
        </div>
      ))}
    </div>
  );
};

// Example 6: Status-specific visits
export const StatusVisitsExample: React.FC = () => {
  const { visits, isLoading } = useVisitsByStatus('Complete', {
    limit: 200,
    orderBy: 'date',
    orderDirection: 'desc'
  });
  
  if (isLoading) return <div>Loading complete visits...</div>;
  
  return (
    <div>
      <h2>Complete Visits ({visits.length})</h2>
      {visits.map((visit: any) => (
        <div key={visit.id}>
          {visit.cci_name} - {visit.date?.toString()}
        </div>
      ))}
    </div>
  );
};

// Example 7: Paginated visits
export const PaginatedVisitsExample: React.FC = () => {
  const { 
    visits, 
    isLoading, 
    currentPage, 
    hasNextPage, 
    hasPrevPage, 
    nextPage, 
    prevPage, 
    resetPagination 
  } = usePaginatedVisits({
    pageSize: 20,
    orderBy: 'date',
    orderDirection: 'desc'
  });
  
  if (isLoading) return <div>Loading paginated visits...</div>;
  
  return (
    <div>
      <h2>Paginated Visits - Page {currentPage + 1}</h2>
      <div>
        <button onClick={prevPage} disabled={!hasPrevPage}>Previous</button>
        <button onClick={nextPage} disabled={!hasNextPage}>Next</button>
        <button onClick={resetPagination}>Reset</button>
      </div>
      {visits.map((visit: any) => (
        <div key={visit.id}>
          {visit.cci_name} - {visit.date?.toString()}
        </div>
      ))}
    </div>
  );
};

// Example 8: Preloading and cache management
export const CacheManagementExample: React.FC = () => {
  const { preload } = usePreloadVisits();
  const { clearCache, getCacheStats } = useVisitCache();
  
  const handlePreload = async () => {
    await preload();
    console.log('Preloading completed');
  };
  
  const handleClearCache = () => {
    clearCache();
    console.log('Cache cleared');
  };
  
  const handleShowStats = () => {
    const stats = getCacheStats();
    console.log('Cache stats:', stats);
  };
  
  return (
    <div>
      <h2>Cache Management</h2>
      <button onClick={handlePreload}>Preload Common Queries</button>
      <button onClick={handleClearCache}>Clear Cache</button>
      <button onClick={handleShowStats}>Show Cache Stats</button>
    </div>
  );
};

// Example 9: Advanced query with multiple filters
export const AdvancedQueryExample: React.FC = () => {
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-01-31');
  
  const { visits, isLoading, error, refetch } = useVisitsInRange(startDate, endDate, {
    status: 'Complete',
    limit: 100,
    orderBy: 'date',
    orderDirection: 'desc',
    revalidateOnFocus: true,
    dedupingInterval: 30000 // 30 seconds
  });
  
  if (isLoading) return <div>Loading advanced query...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h2>Advanced Query Results ({visits.length})</h2>
      <button onClick={refetch}>Refresh</button>
      <p>Complete visits in January 2024</p>
      {visits.map((visit: any) => (
        <div key={visit.id}>
          {visit.cci_name} - {visit.filledBy} - {visit.date?.toString()}
        </div>
      ))}
    </div>
  );
};

export default {
  NotesViewExample,
  UserVisitsExample,
  DayViewExample,
  AdminVisitsExample,
  CCIVisitsExample,
  StatusVisitsExample,
  PaginatedVisitsExample,
  CacheManagementExample,
  AdvancedQueryExample
};
