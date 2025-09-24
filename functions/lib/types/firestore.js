"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLLECTIONS = void 0;
exports.isUserDoc = isUserDoc;
exports.isVisitDoc = isVisitDoc;
exports.isCCIDoc = isCCIDoc;
exports.isCciUserLinkDoc = isCciUserLinkDoc;
exports.isVersionEventDoc = isVersionEventDoc;
exports.isVersionSnapshotDoc = isVersionSnapshotDoc;
exports.timestampToDate = timestampToDate;
exports.ensureDocumentId = ensureDocumentId;
exports.createDocumentData = createDocumentData;
exports.updateDocumentData = updateDocumentData;
// Collection names as const
exports.COLLECTIONS = {
    USERS: 'users',
    VISITS: 'visits',
    CCIS: 'ccis',
    CCI_USER_LINKS: 'cci_user_links',
    EVENTS: 'events',
    SNAPSHOTS: 'snapshots'
};
// Type guards for runtime type checking
function isUserDoc(doc) {
    return doc && typeof doc.uid === 'string' && typeof doc.email === 'string' && typeof doc.role === 'string';
}
function isVisitDoc(doc) {
    return doc && typeof doc.cci_id === 'string' && typeof doc.cci_name === 'string' && doc.date;
}
function isCCIDoc(doc) {
    return doc && typeof doc.name === 'string';
}
function isCciUserLinkDoc(doc) {
    return doc && typeof doc.user_id === 'string' && Array.isArray(doc.cci_id);
}
function isVersionEventDoc(doc) {
    return doc && typeof doc.visitId === 'string' && typeof doc.userId === 'string' && typeof doc.action === 'string';
}
function isVersionSnapshotDoc(doc) {
    return doc && typeof doc.visitId === 'string' && typeof doc.versionNumber === 'number' && Array.isArray(doc.eventIds);
}
// Utility function to convert Firestore Timestamp to Date
function timestampToDate(timestamp) {
    if (!timestamp)
        return null;
    if (timestamp instanceof Date) {
        return timestamp;
    }
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    if (timestamp && typeof timestamp.getTime === 'function') {
        return new Date(timestamp.getTime());
    }
    if (typeof timestamp === 'number') {
        return new Date(timestamp);
    }
    if (typeof timestamp === 'string') {
        const parsed = new Date(timestamp);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}
// Utility function to ensure document has proper ID
function ensureDocumentId(doc, id) {
    return Object.assign(Object.assign({}, doc), { id });
}
// Utility function to create document without ID (for creation)
function createDocumentData(data) {
    return data;
}
// Utility function to update document data
function updateDocumentData(data) {
    return data;
}
//# sourceMappingURL=firestore.js.map