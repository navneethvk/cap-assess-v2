import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  query, 
  where, 
  Query, 
  CollectionReference
} from 'firebase/firestore';
import type { 
  FirestoreDocument, 
  QueryCondition, 
  CreateData, 
  UpdateData, 
  DocumentWithId
} from '../types/firestore';

/**
 * Typed Firestore Service
 * 
 * This service provides type-safe operations for Firestore documents.
 * All functions use generics to ensure type safety across the application.
 */

// Generic function to add a document to a collection
export const addDocument = async <T extends FirestoreDocument>(
  collectionPath: string, 
  data: CreateData<T>
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, collectionPath), data);
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

// Generic function to get documents from a collection, with optional queries
export const getDocuments = async <T extends FirestoreDocument>(
  collectionPath: string, 
  conditions?: QueryCondition[]
): Promise<DocumentWithId<T>[]> => {
  try {
    let q: Query | CollectionReference = collection(db, collectionPath);
    if (conditions && conditions.length > 0) {
      conditions.forEach(cond => {
        q = query(q, where(cond.field, cond.operator, cond.value));
      });
    }
    const querySnapshot = await getDocs(q);
    const documents: DocumentWithId<T>[] = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...(doc.data() || {}) } as DocumentWithId<T>);
    });
    return documents;
  } catch (e) {
    console.error("Error getting documents: ", e);
    throw e;
  }
};

// Generic function to get a single document by ID
export const getDocument = async <T extends FirestoreDocument>(
  collectionPath: string, 
  id: string
): Promise<DocumentWithId<T> | null> => {
  try {
    const docSnap = await getDocs(query(collection(db, collectionPath), where('__name__', '==', id)));
    if (docSnap.empty) {
      return null;
    }
    const docData = docSnap.docs[0];
    return { id: docData.id, ...docData.data() } as DocumentWithId<T>;
  } catch (e) {
    console.error("Error getting document: ", e);
    throw e;
  }
};

// Generic function to update a document in a collection
export const updateDocument = async <T extends FirestoreDocument>(
  collectionPath: string, 
  id: string, 
  data: UpdateData<T>
): Promise<void> => {
  try {
    const docRef = doc(db, collectionPath, id);
    await updateDoc(docRef, data);
  } catch (e) {
    console.error("Error updating document: ", e);
    throw e;
  }
};

// Generic function to set a document with a specific ID (create or update)
export const setDocument = async <T extends FirestoreDocument>(
  collectionPath: string, 
  id: string, 
  data: Partial<T>, 
  merge: boolean = true
): Promise<void> => {
  try {
    const docRef = doc(db, collectionPath, id);
    await setDoc(docRef, data, { merge });
  } catch (e) {
    console.error("Error setting document: ", e);
    throw e;
  }
};

// Generic function to delete a document from a collection
export const deleteDocument = async (
  collectionPath: string, 
  id: string
): Promise<void> => {
  try {
    await deleteDoc(doc(db, collectionPath, id));
  } catch (e) {
    console.error("Error deleting document: ", e);
    throw e;
  }
};

// Typed collection-specific functions for better developer experience
export const addUser = async (data: CreateData<import('../types/firestore').UserDoc>): Promise<string> => {
  return addDocument<import('../types/firestore').UserDoc>('users', data);
};

export const addVisit = async (data: CreateData<import('../types/firestore').VisitDoc>): Promise<string> => {
  return addDocument<import('../types/firestore').VisitDoc>('visits', data);
};

export const addCCI = async (data: CreateData<import('../types/firestore').CCIDoc>): Promise<string> => {
  return addDocument<import('../types/firestore').CCIDoc>('ccis', data);
};

export const getUsers = async (conditions?: QueryCondition[]): Promise<DocumentWithId<import('../types/firestore').UserDoc>[]> => {
  return getDocuments<import('../types/firestore').UserDoc>('users', conditions);
};

export const getVisits = async (conditions?: QueryCondition[]): Promise<DocumentWithId<import('../types/firestore').VisitDoc>[]> => {
  return getDocuments<import('../types/firestore').VisitDoc>('visits', conditions);
};

export const getCCIs = async (conditions?: QueryCondition[]): Promise<DocumentWithId<import('../types/firestore').CCIDoc>[]> => {
  return getDocuments<import('../types/firestore').CCIDoc>('ccis', conditions);
};

export const updateUser = async (id: string, data: UpdateData<import('../types/firestore').UserDoc>): Promise<void> => {
  return updateDocument<import('../types/firestore').UserDoc>('users', id, data);
};

export const updateVisit = async (id: string, data: UpdateData<import('../types/firestore').VisitDoc>): Promise<void> => {
  return updateDocument<import('../types/firestore').VisitDoc>('visits', id, data);
};

export const updateCCI = async (id: string, data: UpdateData<import('../types/firestore').CCIDoc>): Promise<void> => {
  return updateDocument<import('../types/firestore').CCIDoc>('ccis', id, data);
};

// Legacy functions for backward compatibility (deprecated)
/** @deprecated Use addDocument<T> instead */
export const addDocumentLegacy = async (collectionPath: string, data: any) => {
  console.warn('addDocumentLegacy is deprecated. Use addDocument<T> instead.');
  return addDocument(collectionPath, data);
};

/** @deprecated Use getDocuments<T> instead */
export const getDocumentsLegacy = async (collectionPath: string, conditions?: { field: string, operator: any, value: any }[]) => {
  console.warn('getDocumentsLegacy is deprecated. Use getDocuments<T> instead.');
  const typedConditions: QueryCondition[] | undefined = conditions?.map(cond => ({
    field: cond.field,
    operator: cond.operator as QueryCondition['operator'],
    value: cond.value
  }));
  return getDocuments(collectionPath, typedConditions);
};

/** @deprecated Use updateDocument<T> instead */
export const updateDocumentLegacy = async (collectionPath: string, id: string, data: any) => {
  console.warn('updateDocumentLegacy is deprecated. Use updateDocument<T> instead.');
  return updateDocument(collectionPath, id, data);
};
