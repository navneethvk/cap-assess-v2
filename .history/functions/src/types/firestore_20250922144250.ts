import * as admin from 'firebase-admin'

/**
 * Shared Firestore Type Definitions for Cloud Functions
 * 
 * This file contains type definitions that match the frontend types
 * to ensure consistency between the UI, hooks, and Cloud Functions.
 */

// Base interface for all Firestore documents
export interface FirestoreDocument {
  id: string
}

// Base interface for documents with timestamps
export interface TimestampedDocument extends FirestoreDocument {
  createdAt?: admin.firestore.Timestamp | admin.firestore.FieldValue
  updatedAt?: admin.firestore.Timestamp | admin.firestore.FieldValue
}

// User-related types
export interface UserDoc extends TimestampedDocument {
  uid: string
  email: string
  username?: string
  role: 'Admin' | 'EM' | 'Pending'
  status: 'Active' | 'Inactive'
  displayName?: string
  pinnedVisits?: string[] // Array of visit IDs
}

// CCI (Child Care Institution) types
export interface CCIDoc extends FirestoreDocument {
  id: string
  name: string
  cci_name?: string // Alternative field name used in some places
  city?: string
  state?: string
  address?: string
  contact?: string
  email?: string
  phone?: string
  status?: 'Active' | 'Inactive'
}

// Visit-related types
export interface VisitDoc extends TimestampedDocument {
  id: string
  date: admin.firestore.Timestamp | admin.firestore.FieldValue
  cci_id: string
  cci_name: string
  filledByUid: string
  filledBy: string
  status: 'Complete' | 'Incomplete' | 'Pending'
  agenda?: string
  debrief?: string
  notes?: VisitNote[]
  quality?: 'Excellent' | 'Good' | 'Average' | 'Poor'
  personMet?: string
  visitHours?: 'Full' | 'Half' | 'Drop-In' | 'Special'
  order?: number // For timeline ordering
}

// Visit note types
export interface VisitNote {
  id: string
  text: string
  createdAt: admin.firestore.Timestamp | admin.firestore.FieldValue
  createdBy: string
  updatedAt?: admin.firestore.Timestamp | admin.firestore.FieldValue
}

// CCI-User link types
export interface CciUserLinkDoc extends FirestoreDocument {
  id: string
  user_id: string
  cci_id: string[]
  createdAt?: admin.firestore.Timestamp | admin.firestore.FieldValue
  updatedAt?: admin.firestore.Timestamp | admin.firestore.FieldValue
}

// Version history types
export interface VersionEventDoc extends FirestoreDocument {
  id: string
  visitId: string
  userId: string
  userName: string
  action: 'create' | 'update' | 'delete'
  field: string
  beforeValue?: string
  afterValue?: string
  timestamp: admin.firestore.Timestamp | admin.firestore.FieldValue
  diff?: string
}

export interface VersionSnapshotDoc extends FirestoreDocument {
  id: string
  visitId: string
  versionNumber: number
  eventIds: string[]
  createdAt: admin.firestore.Timestamp | admin.firestore.FieldValue
  createdBy: string
  summary?: string
}

// Collection names as const
export const COLLECTIONS = {
  USERS: 'users',
  VISITS: 'visits',
  CCIS: 'ccis',
  CCI_USER_LINKS: 'cci_user_links',
  EVENTS: 'events',
  SNAPSHOTS: 'snapshots'
} as const

// Type for collection names
export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS]

// Generic document type that can be any of our document types
export type AnyDocument = 
  | UserDoc 
  | VisitDoc 
  | CCIDoc 
  | CciUserLinkDoc 
  | VersionEventDoc 
  | VersionSnapshotDoc

// Type for Firestore update data
export type UpdateData<T extends FirestoreDocument> = Partial<Omit<T, 'id'>>

// Type for Firestore create data
export type CreateData<T extends FirestoreDocument> = Omit<T, 'id'>

// Type for documents with ID (used in queries)
export type DocumentWithId<T extends FirestoreDocument> = T & { id: string }

// Type for partial documents (used in updates)
export type PartialDocument<T extends FirestoreDocument> = Partial<T> & { id: string }

// Type guards for runtime type checking
export function isUserDoc(doc: any): doc is UserDoc {
  return doc && typeof doc.uid === 'string' && typeof doc.email === 'string' && typeof doc.role === 'string'
}

export function isVisitDoc(doc: any): doc is VisitDoc {
  return doc && typeof doc.cci_id === 'string' && typeof doc.cci_name === 'string' && doc.date
}

export function isCCIDoc(doc: any): doc is CCIDoc {
  return doc && typeof doc.name === 'string'
}

export function isCciUserLinkDoc(doc: any): doc is CciUserLinkDoc {
  return doc && typeof doc.user_id === 'string' && Array.isArray(doc.cci_id)
}

export function isVersionEventDoc(doc: any): doc is VersionEventDoc {
  return doc && typeof doc.visitId === 'string' && typeof doc.userId === 'string' && typeof doc.action === 'string'
}

export function isVersionSnapshotDoc(doc: any): doc is VersionSnapshotDoc {
  return doc && typeof doc.visitId === 'string' && typeof doc.versionNumber === 'number' && Array.isArray(doc.eventIds)
}

// Utility function to convert Firestore Timestamp to Date
export function timestampToDate(timestamp: admin.firestore.Timestamp | Date | any): Date | null {
  if (!timestamp) return null
  
  if (timestamp instanceof Date) {
    return timestamp
  }
  
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate()
  }
  
  if (timestamp && typeof timestamp.getTime === 'function') {
    return new Date(timestamp.getTime())
  }
  
  if (typeof timestamp === 'number') {
    return new Date(timestamp)
  }
  
  if (typeof timestamp === 'string') {
    const parsed = new Date(timestamp)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  
  return null
}

// Utility function to ensure document has proper ID
export function ensureDocumentId<T extends FirestoreDocument>(doc: T, id: string): T {
  return { ...doc, id }
}

// Utility function to create document without ID (for creation)
export function createDocumentData<T extends FirestoreDocument>(data: CreateData<T>): Omit<T, 'id'> {
  return data as Omit<T, 'id'>
}

// Utility function to update document data
export function updateDocumentData<T extends FirestoreDocument>(data: UpdateData<T>): Partial<T> {
  return data as Partial<T>
}
