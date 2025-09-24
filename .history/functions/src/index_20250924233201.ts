import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import type { UserDoc, CreateData } from "./types/firestore";

admin.initializeApp();

export const createUserRecord = functions.auth.user().onCreate(async (user) => {
  try {
    const userRef = admin.firestore().collection("users").doc(user.uid);
    const userData: CreateData<UserDoc> = {
      email: user.email || '',
      uid: user.uid,
      role: "Pending",
      status: "Active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await userRef.set(userData, { merge: true });
    await admin.auth().setCustomUserClaims(user.uid, { role: "Pending" });
    console.log(`User record created and custom claim set for ${user.email} with role: Pending`);
  } catch (error) {
    console.error("Error creating user record:", error);
  }
});

export const updateUserRoleClaim = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();
    const userId = context.params.userId;

    console.log(`updateUserRoleClaim: Triggered for userId: ${userId}`);
    console.log(`updateUserRoleClaim: Previous data: ${JSON.stringify(previousValue)}`);
    console.log(`updateUserRoleClaim: New data: ${JSON.stringify(newValue)}`);

    if (newValue.role === previousValue.role) {
      console.log("updateUserRoleClaim: Role has not changed, no need to update custom claims.");
      return null;
    }

    console.log(`updateUserRoleClaim: Attempting to set custom claim for user ${userId} with role: ${newValue.role}`);
    try {
      await admin.auth().setCustomUserClaims(userId, { role: newValue.role });
      console.log(`updateUserRoleClaim: Custom claim for user ${userId} successfully updated to role: ${newValue.role}`);
    } catch (error) {
      console.error(`updateUserRoleClaim: Error updating custom claim for user ${userId}:`, error);
    }
    return null;
  });

export const panelCreateUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated.");
  }
  const token: Record<string, unknown> = context.auth.token || {};
  const role = token.role as string | undefined;
  if (role !== "Admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin privileges required.");
  }

  const email: string = (data?.email || "").toString().trim();
  const password: string = (data?.password || "").toString();
  const newRole: string = (data?.role || "Pending").toString();
  const username: string = (data?.username || "").toString().trim();

  if (!email || !password) {
    throw new functions.https.HttpsError("invalid-argument", "Email and password are required.");
  }
  if (password.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "Password must be at least 6 characters.");
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: username || undefined,
      emailVerified: false,
      disabled: false,
    });
    const uid = userRecord.uid;
    const userData: CreateData<UserDoc> = {
      uid,
      email,
      role: newRole as UserDoc['role'],
      username: username || undefined,
      status: "Active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await admin.firestore().collection("users").doc(uid).set(userData, { merge: true });
    await admin.auth().setCustomUserClaims(uid, { role: newRole });
    return { uid };
  } catch (err: any) {
    console.error("panelCreateUser error", err);
    throw new functions.https.HttpsError("internal", err?.message || "Failed to create user");
  }
});

const IST_TIME_ZONE = "Asia/Kolkata";
const CSV_HEADERS = [
  "id",
  "date",
  "cci_id",
  "cci_name",
  "filledByUid",
  "filledBy",
  "personMet",
  "quality",
  "visitHours",
  "agenda",
  "debrief",
];
const CSV_INJECTION_PREFIX = /^[=+\-@]/;
const CSV_LINE_BREAK_REGEX = /\r\n|\n|\r/g;
const VISIT_BATCH_SIZE = 500;
const DEFAULT_STORAGE_PREFIX = "backups/visits";

interface VisitCsvRow {
  id: string;
  date: string;
  cci_id: string;
  cci_name: string;
  filledByUid: string;
  filledBy: string;
  personMet: string;
  quality: string;
  visitHours: string;
  agenda: string;
  debrief: string;
}

function ensureDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate();
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function formatIstDate(value: unknown): string {
  const date = ensureDate(value);
  if (!date) {
    return "";
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatIstTimestampForFilename(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const map = new Map<string, string>();
  for (const part of parts) {
    if (part.type !== "literal") {
      map.set(part.type, part.value);
    }
  }

  const year = map.get("year") ?? "0000";
  const month = map.get("month") ?? "00";
  const day = map.get("day") ?? "00";
  const hour = (map.get("hour") ?? "00").replace(/[^0-9]/g, "");
  const minute = map.get("minute") ?? "00";
  const second = map.get("second") ?? "00";

  return `${year}${month}${day}_${hour}${minute}${second}`;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toPlainString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value.toString();
  }
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString();
  }
  return JSON.stringify(value);
}

function escapeCsvValue(value: string): string {
  let sanitized = value.replace(CSV_LINE_BREAK_REGEX, " ");
  sanitized = sanitized.trim();
  if (CSV_INJECTION_PREFIX.test(sanitized)) {
    sanitized = `'${sanitized}`;
  }
  sanitized = sanitized.replace(/"/g, '""');
  return `"${sanitized}"`;
}

async function fetchVisitRows(): Promise<VisitCsvRow[]> {
  const firestore = admin.firestore();
  const visitsRef = firestore.collection("visits");
  const rows: VisitCsvRow[] = [];

  let lastDocumentId: string | null = null;
  // Page through the collection to avoid loading everything at once
  while (true) {
    let query = visitsRef
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(VISIT_BATCH_SIZE);
    if (lastDocumentId) {
      query = query.startAfter(lastDocumentId);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      break;
    }

    for (const doc of snapshot.docs) {
      const data = doc.data();
      rows.push({
        id: doc.id,
        date: formatIstDate(data.date),
        cci_id: toPlainString(data.cci_id),
        cci_name: toPlainString(data.cci_name),
        filledByUid: toPlainString(data.filledByUid),
        filledBy: toPlainString(data.filledBy),
        personMet: toPlainString(data.personMet),
        quality: toPlainString(data.quality),
        visitHours: toPlainString(data.visitHours),
        agenda: stripHtml(toPlainString(data.agenda)),
        debrief: stripHtml(toPlainString(data.debrief)),
      });
    }

    lastDocumentId = snapshot.docs[snapshot.docs.length - 1]?.id ?? null;
    if (snapshot.size < VISIT_BATCH_SIZE) {
      break;
    }
  }

  return rows;
}

function buildCsv(rows: VisitCsvRow[]): string {
  const csvRows: string[] = [];
  csvRows.push(CSV_HEADERS.map(escapeCsvValue).join(","));
  for (const row of rows) {
    const values = [
      row.id,
      row.date,
      row.cci_id,
      row.cci_name,
      row.filledByUid,
      row.filledBy,
      row.personMet,
      row.quality,
      row.visitHours,
      row.agenda,
      row.debrief,
    ];
    csvRows.push(values.map(escapeCsvValue).join(","));
  }
  return `${csvRows.join("\r\n")}\r\n`;
}

function getStorageTarget() {
  const bucketName = functions.config().exports?.bucket as string | undefined;
  const prefix = (functions.config().exports?.prefix as string | undefined) ?? DEFAULT_STORAGE_PREFIX;
  return {
    bucketName,
    prefix: prefix.replace(/^\/+|\/+$/g, ""),
  };
}

async function uploadCsvToStorage(csvContent: string, fileName: string) {
  const { bucketName, prefix } = getStorageTarget();
  const bucket = bucketName ? admin.storage().bucket(bucketName) : admin.storage().bucket();
  const normalizedPrefix = prefix ? `${prefix}/` : "";
  const filePath = `${normalizedPrefix}${fileName}`;
  const file = bucket.file(filePath);
  await file.save(csvContent, {
    contentType: "text/csv",
    resumable: false,
  });
  return {
    bucket: bucket.name,
    filePath,
    gsUri: `gs://${bucket.name}/${filePath}`,
  };
}

async function exportVisitsCsvInternal() {
  const rows = await fetchVisitRows();
  const csvContent = buildCsv(rows);
  const fileName = `visits_${formatIstTimestampForFilename(new Date())}.csv`;
  const uploadResult = await uploadCsvToStorage(csvContent, fileName);
  return { ...uploadResult, fileName, rowCount: rows.length };
}

export const exportVisitsCsvNightly = functions.pubsub
  .schedule("0 3 * * *")
  .timeZone(IST_TIME_ZONE)
  .onRun(async () => {
    try {
      const result = await exportVisitsCsvInternal();
      functions.logger.info("Visits CSV export completed", result);
    } catch (error) {
      functions.logger.error("Visits CSV export failed", error as Error);
      throw error;
    }
  });

export const panelExportVisitsCsv = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
  }
  const token: Record<string, unknown> = context.auth.token || {};
  if (token.role !== "Admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin privileges required.");
  }

  try {
    const result = await exportVisitsCsvInternal();
    functions.logger.info("Visits CSV export triggered by admin", {
      uid: context.auth.uid,
      ...result,
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    functions.logger.error("Admin-triggered visits CSV export failed", error as Error);
    throw new functions.https.HttpsError("internal", `Failed to export visits CSV: ${message}`);
  }
});

// Version History Cloud Function
export const captureVersionHistory = functions.firestore
  .document("visits/{visitId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const visitId = context.params.visitId;

    functions.logger.info(`captureVersionHistory triggered for visit ${visitId}`, {
      visitId,
      beforeKeys: Object.keys(before),
      afterKeys: Object.keys(after)
    });

    try {
      // Get user info from the update
      const userId = after.filledByUid;
      if (!userId) {
        functions.logger.warn(`No filledByUid found for visit ${visitId}`);
        return null;
      }

      // Get user details
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      const userData = userDoc.data();
      const userName = userData?.email || userData?.username || "Unknown User";

      const events: any[] = [];

      // Check for agenda changes
      const beforeAgenda = stripHtml(before.agenda || "");
      const afterAgenda = stripHtml(after.agenda || "");
      if (beforeAgenda !== afterAgenda) {
        events.push({
          type: "agenda_edit",
          beforeValue: beforeAgenda,
          afterValue: afterAgenda,
          userId,
          userName,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Check for debrief changes
      const beforeDebrief = stripHtml(before.debrief || "");
      const afterDebrief = stripHtml(after.debrief || "");
      if (beforeDebrief !== afterDebrief) {
        events.push({
          type: "debrief_edit",
          beforeValue: beforeDebrief,
          afterValue: afterDebrief,
          userId,
          userName,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Check for notes changes
      const beforeNotes = before.notes || [];
      const afterNotes = after.notes || [];
      
      // Find added notes
      const addedNotes = afterNotes.filter((note: any) => 
        !beforeNotes.some((beforeNote: any) => beforeNote.id === note.id)
      );
      
      // Find edited notes
      const editedNotes = afterNotes.filter((note: any) => {
        const beforeNote = beforeNotes.find((beforeNote: any) => beforeNote.id === note.id);
        return beforeNote && stripHtml(beforeNote.text || "") !== stripHtml(note.text || "");
      });
      
      // Find deleted notes
      const deletedNotes = beforeNotes.filter((note: any) => 
        !afterNotes.some((afterNote: any) => afterNote.id === note.id)
      );

      // Add note events
      for (const note of addedNotes) {
        events.push({
          type: "note_add",
          beforeValue: "",
          afterValue: stripHtml(note.text || ""),
          userId,
          userName,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          metadata: { noteId: note.id },
        });
      }

      for (const note of editedNotes) {
        const beforeNote = beforeNotes.find((beforeNote: any) => beforeNote.id === note.id);
        events.push({
          type: "note_edit",
          beforeValue: stripHtml(beforeNote?.text || ""),
          afterValue: stripHtml(note.text || ""),
          userId,
          userName,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          metadata: { noteId: note.id },
        });
      }

      for (const note of deletedNotes) {
        events.push({
          type: "note_delete",
          beforeValue: stripHtml(note.text || ""),
          afterValue: "",
          userId,
          userName,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          metadata: { noteId: note.id },
        });
      }

      // Save all events
      if (events.length > 0) {
        const batch = admin.firestore().batch();
        for (const event of events) {
          const eventRef = admin.firestore()
            .collection("visits")
            .doc(visitId)
            .collection("events")
            .doc();
          batch.set(eventRef, event);
        }
        await batch.commit();
        
        functions.logger.info(`Captured ${events.length} version history events for visit ${visitId}`, {
          visitId,
          userId,
          eventTypes: events.map(e => e.type),
        });

        // Check if we need to create a snapshot (every 10 events)
        await checkAndCreateSnapshot(visitId);
      }

      return null;
    } catch (error) {
      functions.logger.error(`Error capturing version history for visit ${visitId}:`, error);
      return null;
    }
  });

// Helper function to check and create snapshots
async function checkAndCreateSnapshot(visitId: string) {
  try {
    functions.logger.info(`checkAndCreateSnapshot called for visit ${visitId}`);
    
    const firestore = admin.firestore();
    const eventsRef = firestore
      .collection("visits")
      .doc(visitId)
      .collection("events");
    const snapshotsRef = firestore
      .collection("visits")
      .doc(visitId)
      .collection("snapshots");
    
    // Get all events (without ordering first to avoid index issues)
    const eventsSnapshot = await eventsRef.get();
    
    const allEvents = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a: any, b: any) => {
      // Sort by timestamp (ascending - oldest first)
      const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
      const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
      return aTime.getTime() - bTime.getTime();
    });
    
    functions.logger.info(`Found ${allEvents.length} total events for visit ${visitId}`);
    
    if (allEvents.length === 0) {
      functions.logger.info(`No events found for visit ${visitId}, skipping snapshot creation`);
      return; // No events to process
    }
    
    // Get existing snapshots to see which events are already snapshotted
    const existingSnapshotsSnapshot = await snapshotsRef.get();
    const existingSnapshots = existingSnapshotsSnapshot.docs.map(doc => doc.data());
    
    functions.logger.info(`Found ${existingSnapshots.length} existing snapshots for visit ${visitId}`);
    
    // Get all event IDs that are already in snapshots
    const snapshottedEventIds = new Set<string>();
    existingSnapshots.forEach(snapshot => {
      if (snapshot.eventIds) {
        snapshot.eventIds.forEach((eventId: string) => snapshottedEventIds.add(eventId));
      }
    });
    
    functions.logger.info(`Found ${snapshottedEventIds.size} events already in snapshots for visit ${visitId}`);
    
    // Filter out events that are already in snapshots
    const unsnapshottedEvents = allEvents.filter(event => !snapshottedEventIds.has(event.id));
    
    functions.logger.info(`Found ${unsnapshottedEvents.length} unsnapshotted events for visit ${visitId}`);
    
    if (unsnapshottedEvents.length === 0) {
      functions.logger.info(`All events are already snapshotted for visit ${visitId}, skipping snapshot creation`);
      return; // All events are already snapshotted
    }
    
    // Only create snapshots for full batches of 10 events
    // Leave remaining events (less than 10) as "Recent Edits"
    const fullBatches = [];
    for (let i = 0; i < unsnapshottedEvents.length; i += 10) {
      const batch = unsnapshottedEvents.slice(i, i + 10);
      if (batch.length === 10) {
        fullBatches.push(batch);
      } else {
        // This is a partial batch (less than 10 events)
        // Don't create a snapshot for it - these will remain as "Recent Edits"
        functions.logger.info(`Skipping partial batch of ${batch.length} events for visit ${visitId} - will remain as Recent Edits`);
        break; // Stop processing since we've reached the partial batch
      }
    }
    
    functions.logger.info(`Found ${fullBatches.length} full batches (10 events each) to snapshot for visit ${visitId}`);
    
    // Process only full batches
    for (const batch of fullBatches) {
      // Get the latest snapshot number for this visit
      const latestSnapshotSnapshot = await snapshotsRef
        .orderBy("version", "desc")
        .limit(1)
        .get();
      
      const latestVersion = latestSnapshotSnapshot.empty ? 0 : latestSnapshotSnapshot.docs[0].data().version;
      const newVersion = latestVersion + 1;
      
      // Create the snapshot with event IDs (not full event data)
      const snapshotData = {
        version: newVersion,
        title: `Version ${newVersion}`,
        eventIds: batch.map(event => event.id), // Store only event IDs
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        eventCount: batch.length,
        summary: generateSnapshotSummary(batch)
      };
      
      // Save the snapshot
      const snapshotRef = snapshotsRef.doc();
      await snapshotRef.set(snapshotData);
      
      functions.logger.info(`Created snapshot Version ${newVersion} for visit ${visitId}`, {
        visitId,
        version: newVersion,
        eventCount: batch.length,
        eventIds: batch.map(e => e.id)
      });
    }
  } catch (error) {
    functions.logger.error(`Error creating snapshot for visit ${visitId}:`, error);
  }
}

// Helper function to generate a summary for the snapshot
function generateSnapshotSummary(events: any[]): string {
  const eventTypes = events.map(e => e.type);
  const typeCounts = eventTypes.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const summaryParts = [];
  if (typeCounts.agenda_edit) summaryParts.push(`${typeCounts.agenda_edit} agenda edit${typeCounts.agenda_edit > 1 ? 's' : ''}`);
  if (typeCounts.debrief_edit) summaryParts.push(`${typeCounts.debrief_edit} debrief edit${typeCounts.debrief_edit > 1 ? 's' : ''}`);
  if (typeCounts.note_add) summaryParts.push(`${typeCounts.note_add} note${typeCounts.note_add > 1 ? 's' : ''} added`);
  if (typeCounts.note_edit) summaryParts.push(`${typeCounts.note_edit} note${typeCounts.note_edit > 1 ? 's' : ''} edited`);
  if (typeCounts.note_delete) summaryParts.push(`${typeCounts.note_delete} note${typeCounts.note_delete > 1 ? 's' : ''} deleted`);
  
  return summaryParts.join(', ');
}

// Cloud Function to clear version history for a specific visit
export const clearVersionHistory = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to clear version history');
  }

  const { visitId } = data;
  
  if (!visitId) {
    throw new functions.https.HttpsError('invalid-argument', 'visitId is required');
  }

  try {
    const firestore = admin.firestore();
    const visitRef = firestore.collection('visits').doc(visitId);
    
    // Delete all events in the events subcollection
    const eventsSnapshot = await visitRef.collection('events').get();
    const eventBatch = firestore.batch();
    eventsSnapshot.docs.forEach(doc => {
      eventBatch.delete(doc.ref);
    });
    await eventBatch.commit();
    
    // Delete all snapshots in the snapshots subcollection
    const snapshotsSnapshot = await visitRef.collection('snapshots').get();
    const snapshotBatch = firestore.batch();
    snapshotsSnapshot.docs.forEach(doc => {
      snapshotBatch.delete(doc.ref);
    });
    await snapshotBatch.commit();
    
    functions.logger.info(`Cleared version history for visit ${visitId}`, {
      visitId,
      eventsDeleted: eventsSnapshot.docs.length,
      snapshotsDeleted: snapshotsSnapshot.docs.length
    });
    
    return {
      success: true,
      eventsDeleted: eventsSnapshot.docs.length,
      snapshotsDeleted: snapshotsSnapshot.docs.length
    };
  } catch (error) {
    functions.logger.error(`Error clearing version history for visit ${visitId}:`, error);
    throw new functions.https.HttpsError('internal', 'Failed to clear version history');
  }
});

// Insight Data Aggregator Functions
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
    
    functions.logger.info(`Aggregating weekly visits for week ${weekId}`, {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString()
    });

    // Query visits for the week
    const visitsSnapshot = await admin.firestore().collection('visits')
      .where('date', '>=', admin.firestore.Timestamp.fromDate(weekStart))
      .where('date', '<=', admin.firestore.Timestamp.fromDate(weekEnd))
      .get();

    if (visitsSnapshot.empty) {
      functions.logger.info(`No visits found for week ${weekId}`);
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

    // User and CCI tracking with detailed aggregation
    const uniqueUsers = new Set<string>();
    const cciStats = new Map<string, { cciName: string; cciCity: string | null; count: number }>();
    const userStats = new Map<string, {
      uid: string;
      email: string | null;
      username: string | null;
      role: string | null;
      visitCount: number;
      visitsByStatus: { [key: string]: number };
      visitsByRole: { em: number; visitor: number };
      visitsByQuality: { [key: string]: number };
      visitsByPersonMet: { [key: string]: number };
      visitsByHours: { [key: string]: number };
      cciIds: Set<string>;
      firstVisitDate: Date | null;
      lastVisitDate: Date | null;
    }>();

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

      // Track unique users and detailed user stats
      if (visit.filledByUid) {
        uniqueUsers.add(visit.filledByUid);
        
        // Get or create user stats
        let userStat = userStats.get(visit.filledByUid);
        if (!userStat) {
          userStat = {
            uid: visit.filledByUid,
            email: visit.filledByEmail || null,
            username: visit.filledByUsername || null,
            role: visit.filledBy || null,
            visitCount: 0,
            visitsByStatus: {},
            visitsByRole: { em: 0, visitor: 0 },
            visitsByQuality: {},
            visitsByPersonMet: {},
            visitsByHours: {},
            cciIds: new Set<string>(),
            firstVisitDate: null,
            lastVisitDate: null
          };
          userStats.set(visit.filledByUid, userStat);
        }
        
        // Update user stats
        userStat.visitCount++;
        
        // Status breakdown
        userStat.visitsByStatus[status] = (userStat.visitsByStatus[status] || 0) + 1;
        
        // Role breakdown
        if (visit.filledBy === 'EM') {
          userStat.visitsByRole.em++;
        } else {
          userStat.visitsByRole.visitor++;
        }
        
        // Quality breakdown
        userStat.visitsByQuality[quality] = (userStat.visitsByQuality[quality] || 0) + 1;
        
        // Person met breakdown
        userStat.visitsByPersonMet[personMet] = (userStat.visitsByPersonMet[personMet] || 0) + 1;
        
        // Hours breakdown
        userStat.visitsByHours[visitHours] = (userStat.visitsByHours[visitHours] || 0) + 1;
        
        // CCI tracking
        if (visit.cci_id) {
          userStat.cciIds.add(visit.cci_id);
        }
        
        // Date tracking
        const visitDate = visit.date?.toDate ? visit.date.toDate() : new Date(visit.date);
        if (!userStat.firstVisitDate || visitDate < userStat.firstVisitDate) {
          userStat.firstVisitDate = visitDate;
        }
        if (!userStat.lastVisitDate || visitDate > userStat.lastVisitDate) {
          userStat.lastVisitDate = visitDate;
        }
      }

      // Track CCI stats
      if (visit.cci_id && visit.cci_name) {
        const existing = cciStats.get(visit.cci_id);
        const cciCity = (visit.cci_city ?? visit.cciCity ?? null) as string | null;
        if (existing) {
          existing.count++;
          if (!existing.cciCity && cciCity) {
            existing.cciCity = cciCity;
          }
        } else {
          cciStats.set(visit.cci_id, {
            cciName: visit.cci_name,
            cciCity,
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
      visitsByCci: Object.fromEntries(
        Array.from(cciStats.entries()).map(([cciId, stats]) => [
          cciId,
          {
            cciName: stats.cciName,
            cciCity: stats.cciCity ?? null,
            visitCount: stats.count
          }
        ])
      )
    };

    // Create the insight document
    const insightDoc: any = {
      dataType: 'weekly_visits_count',
      data: {
        weekId,
        weekStart: admin.firestore.Timestamp.fromDate(weekStart),
        weekEnd: admin.firestore.Timestamp.fromDate(weekEnd),
        counts,
        userBreakdown,
        cciBreakdown
      },
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdatedDisplay: new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      version: 1
    };

    // Store in Firestore
    await admin.firestore().collection('insight_data').doc(`weekly_visits_count_${weekId}`).set(insightDoc);

    functions.logger.info(`Successfully aggregated weekly visits for week ${weekId}`, {
      totalVisits: counts.total,
      uniqueUsers: uniqueUsers.size,
      uniqueCcis: cciStats.size
    });

  } catch (error) {
    functions.logger.error('Error aggregating weekly visits count:', error);
    throw error;
  }
}

/**
 * Check if insights collection exists and has data
 */
async function checkInsightsCollectionExists(): Promise<boolean> {
  try {
    const snapshot = await admin.firestore().collection('insight_data')
      .where('dataType', '==', 'weekly_visits_count')
      .limit(1)
      .get();
    
    return !snapshot.empty;
  } catch (error) {
    functions.logger.error('Error checking insights collection:', error);
    return false;
  }
}

/**
 * Get the date range for initial aggregation (last 12 months)
 */
function getInitialAggregationDateRange(): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  
  // Go back 12 months to ensure we have historical data
  for (let i = 0; i < 52; i++) { // 52 weeks = ~12 months
    const date = new Date(now);
    date.setDate(date.getDate() - (i * 7)); // Go back by weeks
    dates.push(date);
  }
  
  return dates;
}

/**
 * Main Cloud Function - runs daily at 12:00 AM IST
 */
export const insightDataAggregator = functions.pubsub
  .schedule('0 18 * * *') // 12:00 AM IST = 6:30 PM UTC (adjust as needed)
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    functions.logger.info('Starting insight data aggregation', {
      currentTime: new Date().toISOString()
    });

  try {
    // Check if insights collection exists
    const insightsExist = await checkInsightsCollectionExists();
    
    if (!insightsExist) {
      functions.logger.info('Insights collection does not exist. Running initial aggregation for historical data...');
      
      // Get date range for initial aggregation
      const datesToAggregate = getInitialAggregationDateRange();
      
      // Aggregate data for each week in the range
      for (const date of datesToAggregate) {
        try {
          await aggregateWeeklyVisitsCount(date);
        } catch (error) {
          functions.logger.warn(`Failed to aggregate data for date ${date.toISOString()}:`, error);
          // Continue with other dates even if one fails
        }
      }
      
      functions.logger.info(`Initial aggregation completed for ${datesToAggregate.length} weeks`);
    } else {
      functions.logger.info('Insights collection exists. Running daily aggregation...');
      
      // Regular daily aggregation - get the date for which to aggregate (previous day to ensure all data is available)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 1);

      // Aggregate weekly visits count for the week containing the target date
      await aggregateWeeklyVisitsCount(targetDate);
    }

    // You can add more aggregation functions here
    // await aggregateMonthlySummary(targetDate);
    // await aggregateYearlyTrends(targetDate);

    functions.logger.info('Insight data aggregation completed successfully');

  } catch (error) {
    functions.logger.error('Insight data aggregation failed:', error);
    throw error;
  }
});
