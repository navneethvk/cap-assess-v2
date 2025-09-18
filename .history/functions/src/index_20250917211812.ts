import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const createUserRecord = functions.auth.user().onCreate(async (user) => {
  try {
    const userRef = admin.firestore().collection("users").doc(user.uid);
    await userRef.set({
      email: user.email,
      uid: user.uid,
      role: "Pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
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
    await admin.firestore().collection("users").doc(uid).set({
      uid,
      email,
      role: newRole,
      username: username || null,
      status: "Active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
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
    const firestore = admin.firestore();
    const eventsRef = firestore
      .collection("visits")
      .doc(visitId)
      .collection("events");
    const snapshotsRef = firestore
      .collection("visits")
      .doc(visitId)
      .collection("snapshots");
    
    // Get all events, ordered by timestamp
    const eventsSnapshot = await eventsRef
      .orderBy("timestamp", "asc")
      .get();
    
    const allEvents = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    if (allEvents.length === 0) {
      return; // No events to process
    }
    
    // Get existing snapshots to see which events are already snapshotted
    const existingSnapshotsSnapshot = await snapshotsRef.get();
    const existingSnapshots = existingSnapshotsSnapshot.docs.map(doc => doc.data());
    
    // Get all event IDs that are already in snapshots
    const snapshottedEventIds = new Set<string>();
    existingSnapshots.forEach(snapshot => {
      if (snapshot.eventIds) {
        snapshot.eventIds.forEach((eventId: string) => snapshottedEventIds.add(eventId));
      }
    });
    
    // Filter out events that are already in snapshots
    const unsnapshottedEvents = allEvents.filter(event => !snapshottedEventIds.has(event.id));
    
    if (unsnapshottedEvents.length === 0) {
      return; // All events are already snapshotted
    }
    
    // Group unsnapshotted events into batches of 10
    const batches = [];
    for (let i = 0; i < unsnapshottedEvents.length; i += 10) {
      batches.push(unsnapshottedEvents.slice(i, i + 10));
    }
    
    // Process each batch
    for (const batch of batches) {
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
