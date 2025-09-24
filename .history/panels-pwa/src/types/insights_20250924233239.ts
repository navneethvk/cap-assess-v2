import { Timestamp } from 'firebase/firestore';

/**
 * Base interface for all insight data documents
 */
export interface BaseInsightDoc {
  id: string;
  dataType: string;
  lastUpdated: Timestamp;
  lastUpdatedDisplay: string; // Human-readable timestamp in IST
  createdAt: Timestamp;
  version: number;
}

/**
 * Weekly visits count insight data
 */
export interface WeeklyVisitsCountDoc extends BaseInsightDoc {
  dataType: 'weekly_visits_count';
  data: {
    // Week identifier (YYYY-WW format)
    weekId: string;
    // Start and end dates of the week
    weekStart: Timestamp;
    weekEnd: Timestamp;
    // Aggregated counts
    counts: {
      total: number;
      byStatus: {
        scheduled: number;
        complete: number;
        cancelled: number;
        pending: number;
        incomplete: number;
      };
      byRole: {
        em: number;
        visitor: number;
      };
      byQuality: {
        excellent: number;
        good: number;
        average: number;
        poor: number;
        objectivesMet: number;
        partiallyMet: number;
        notMet: number;
        redFlag: number;
        none: number;
      };
      byPersonMet: {
        primaryPoc: number;
        projectCoordinator: number;
        staff: number;
        none: number;
      };
      byVisitHours: {
        full: number;
        half: number;
        dropIn: number;
        special: number;
        none: number;
      };
    };
    // User-specific breakdowns with detailed aggregation
    userBreakdown: {
      totalUsers: number;
      activeUsers: number;
      newUsers: number;
      usersByRole: {
        em: number;
        visitor: number;
        admin: number;
      };
      topUsers: Array<{
        uid: string;
        email: string | null;
        username: string | null;
        role: string | null;
        visitCount: number;
        visitsByStatus: { [key: string]: number };
        visitsByQuality: { [key: string]: number };
        cciCount: number;
        firstVisitDate: Timestamp | null;
        lastVisitDate: Timestamp | null;
      }>;
      userStats: Record<string, {
        email: string | null;
        username: string | null;
        role: string | null;
        visitCount: number;
        visitsByStatus: { [key: string]: number };
        visitsByRole: { em: number; visitor: number };
        visitsByQuality: { [key: string]: number };
        visitsByPersonMet: { [key: string]: number };
        visitsByHours: { [key: string]: number };
        cciIds: string[];
        cciCount: number;
        firstVisitDate: Timestamp | null;
        lastVisitDate: Timestamp | null;
      }>;
    };
    // CCI-specific breakdowns
    cciBreakdown: {
      totalCcis: number;
      activeCcis: number;
      visitsByCci: Record<string, {
        cciName: string;
        cciCity?: string;
        visitCount: number;
      }>;
    };
  };
}

/**
 * Monthly summary insight data
 */
export interface MonthlySummaryDoc extends BaseInsightDoc {
  dataType: 'monthly_summary';
  data: {
    monthId: string; // YYYY-MM format
    monthStart: Timestamp;
    monthEnd: Timestamp;
    summary: {
      totalVisits: number;
      averageVisitsPerWeek: number;
      completionRate: number;
      topCcis: Array<{
        cciId: string;
        cciName: string;
        visitCount: number;
      }>;
      topUsers: Array<{
        userId: string;
        userName: string;
        visitCount: number;
      }>;
    };
  };
}

/**
 * Yearly trends insight data
 */
export interface YearlyTrendsDoc extends BaseInsightDoc {
  dataType: 'yearly_trends';
  data: {
    year: number;
    trends: {
      monthlyBreakdown: Array<{
        month: number;
        visitCount: number;
        completionRate: number;
      }>;
      quarterlyTrends: Array<{
        quarter: number;
        visitCount: number;
        growth: number; // percentage change from previous quarter
      }>;
    };
  };
}

/**
 * Union type for all insight data documents
 */
export type InsightDoc = WeeklyVisitsCountDoc | MonthlySummaryDoc | YearlyTrendsDoc;

/**
 * Insight data query options
 */
export interface InsightQueryOptions {
  dataType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  orderBy?: 'weekStart' | 'monthStart' | 'year' | 'lastUpdated';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Insight data aggregation period
 */
export type AggregationPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
