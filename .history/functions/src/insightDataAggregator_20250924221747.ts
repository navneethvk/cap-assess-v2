import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

/**
 * Get week identifier in YYYY-WW format
 */
function getWeekId(date: Date): string {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Get week number of the year
 */
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Get start of week (Monday)
 */
function getStartOfWeek(date: Date): Date {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}

/**
 * Get end of week (Sunday)
 */
function getEndOfWeek(date: Date): Date {
  const endOfWeek = getStartOfWeek(date);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return endOfWeek;
}

/**
 * Aggregate weekly visits data
 */
async function aggregateWeeklyVisitsCount(targetDate: Date): Promise<void> {
  try {
    const weekId = getWeekId(targetDate);
    const weekStart = getStartOfWeek(targetDate);
    const weekEnd = getEndOfWeek(targetDate);
    
    logger.info(`Aggregating weekly visits for week ${weekId}`, {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString()
    });

    // Query visits for the week
    const visitsSnapshot = await db.collection('visits')
      .where('date', '>=', Timestamp.fromDate(weekStart))
      .where('date', '<=', Timestamp.fromDate(weekEnd))
      .get();

    if (visitsSnapshot.empty) {
      logger.info(`No visits found for week ${weekId}`);
      return;
    }

    // Initialize counters
    const counts = {
      total: 0,
      byStatus: {
        scheduled: 0,
        complete: 0,
        cancelled: 0,
        pending: 0,
        incomplete: 0
      },
      byRole: {
        em: 0,
        visitor: 0
      },
      byQuality: {
        excellent: 0,
        good: 0,
        average: 0,
        poor: 0,
        objectivesMet: 0,
        partiallyMet: 0,
        notMet: 0,
        redFlag: 0,
        none: 0
      },
      byPersonMet: {
        primaryPoc: 0,
        projectCoordinator: 0,
        staff: 0,
        none: 0
      },
      byVisitHours: {
        full: 0,
        half: 0,
        dropIn: 0,
        special: 0,
        none: 0
      }
    };

    // User and CCI tracking
    const uniqueUsers = new Set<string>();
    const cciStats = new Map<string, { cciName: string; cciCity?: string; count: number }>();

    // Process each visit
    visitsSnapshot.forEach(doc => {
      const visit = doc.data();
      counts.total++;

      // Status counts
      const status = visit.status?.toLowerCase() || 'scheduled';
      if (status in counts.byStatus) {
        counts.byStatus[status as keyof typeof counts.byStatus]++;
      }

      // Role counts
      if (visit.filledBy === 'EM') {
        counts.byRole.em++;
      } else {
        counts.byRole.visitor++;
      }

      // Quality counts
      const quality = visit.quality?.toLowerCase() || 'none';
      if (quality === 'objectives met') counts.byQuality.objectivesMet++;
      else if (quality === 'partially met/slow pace') counts.byQuality.partiallyMet++;
      else if (quality === 'not met') counts.byQuality.notMet++;
      else if (quality === 'red flag') counts.byQuality.redFlag++;
      else if (quality === 'excellent') counts.byQuality.excellent++;
      else if (quality === 'good') counts.byQuality.good++;
      else if (quality === 'average') counts.byQuality.average++;
      else if (quality === 'poor') counts.byQuality.poor++;
      else counts.byQuality.none++;

      // Person met counts
      const personMet = visit.personMet?.toLowerCase() || 'none';
      if (personMet === 'primary poc') counts.byPersonMet.primaryPoc++;
      else if (personMet === 'project coordinator') counts.byPersonMet.projectCoordinator++;
      else if (personMet === 'staff') counts.byPersonMet.staff++;
      else counts.byPersonMet.none++;

      // Visit hours counts
      const visitHours = visit.visitHours?.toLowerCase() || 'none';
      if (visitHours === 'full') counts.byVisitHours.full++;
      else if (visitHours === 'half') counts.byVisitHours.half++;
      else if (visitHours === 'drop-in') counts.byVisitHours.dropIn++;
      else if (visitHours === 'special') counts.byVisitHours.special++;
      else counts.byVisitHours.none++;

      // Track unique users
      if (visit.filledByUid) {
        uniqueUsers.add(visit.filledByUid);
      }

      // Track CCI stats
      if (visit.cci_id && visit.cci_name) {
        const existing = cciStats.get(visit.cci_id);
        if (existing) {
          existing.count++;
        } else {
          cciStats.set(visit.cci_id, {
            cciName: visit.cci_name,
            cciCity: visit.cci_city,
            count: 1
          });
        }
      }
    });

    // Get user stats (count active users from the week)
    const userBreakdown = {
      totalUsers: uniqueUsers.size,
      activeUsers: uniqueUsers.size, // All users who created visits this week
      newUsers: 0 // Would need historical data to calculate
    };

    // Get CCI breakdown
    const cciBreakdown = {
      totalCcis: cciStats.size,
      activeCcis: cciStats.size,
      visitsByCci: Object.fromEntries(cciStats)
    };

    // Create the insight document
    const insightDoc: any = {
      dataType: 'weekly_visits_count',
      data: {
        weekId,
        weekStart: Timestamp.fromDate(weekStart),
        weekEnd: Timestamp.fromDate(weekEnd),
        counts,
        userBreakdown,
        cciBreakdown
      },
      lastUpdated: Timestamp.now(),
      createdAt: Timestamp.now(),
      version: 1
    };

    // Store in Firestore
    await db.collection('insight_data').doc(`weekly_visits_count_${weekId}`).set(insightDoc);

    logger.info(`Successfully aggregated weekly visits for week ${weekId}`, {
      totalVisits: counts.total,
      uniqueUsers: uniqueUsers.size,
      uniqueCcis: cciStats.size
    });

  } catch (error) {
    logger.error('Error aggregating weekly visits count:', error);
    throw error;
  }
}

/**
 * Main Cloud Function - runs daily at 12:00 AM IST
 */
export const insightDataAggregator = onSchedule({
  schedule: '0 18 * * *', // 12:00 AM IST = 6:30 PM UTC (adjust as needed)
  timeZone: 'Asia/Kolkata',
  memory: '1GiB',
  timeoutSeconds: 540 // 9 minutes
}, async (event) => {
  logger.info('Starting insight data aggregation', {
    scheduledTime: event.scheduleTime,
    currentTime: new Date().toISOString()
  });

  try {
    // Get the date for which to aggregate (previous day to ensure all data is available)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 1);

    // Aggregate weekly visits count for the week containing the target date
    await aggregateWeeklyVisitsCount(targetDate);

    // You can add more aggregation functions here
    // await aggregateMonthlySummary(targetDate);
    // await aggregateYearlyTrends(targetDate);

    logger.info('Insight data aggregation completed successfully');

  } catch (error) {
    logger.error('Insight data aggregation failed:', error);
    throw error;
  }
});
