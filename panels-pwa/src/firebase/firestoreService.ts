import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc, query, where, Query, CollectionReference } from 'firebase/firestore';

// Generic function to add a document to a collection
export const addDocument = async (collectionPath: string, data: any) => {
  try {
    const docRef = await addDoc(collection(db, collectionPath), data);
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};


// Generic function to get documents from a collection, with optional queries
export const getDocuments = async (collectionPath: string, conditions?: { field: string, operator: any, value: any }[]) => {
  try {
    let q: Query | CollectionReference = collection(db, collectionPath);
    if (conditions && conditions.length > 0) {
      conditions.forEach(cond => {
        q = query(q, where(cond.field, cond.operator, cond.value));
      });
    }
    const querySnapshot = await getDocs(q);
    const documents: any[] = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...(doc.data() || {}) });
    });
    return documents;
  } catch (e) {
    console.error("Error getting documents: ", e);
    throw e;
  }
};

// Generic function to update a document in a collection
export const updateDocument = async (collectionPath: string, id: string, data: any) => {
  try {
    const docRef = doc(db, collectionPath, id);
    await updateDoc(docRef, data);
  } catch (e) {
    console.error("Error updating document: ", e);
    throw e;
  }
};

// Generic function to set a document with a specific ID (create or update)
export const setDocument = async (collectionPath: string, id: string, data: any, merge: boolean = true) => {
  try {
    const docRef = doc(db, collectionPath, id);
    await setDoc(docRef, data, { merge });
  } catch (e) {
    console.error("Error setting document: ", e);
    throw e;
  }
};

// Generic function to delete a document from a collection
export const deleteDocument = async (collectionPath: string, id: string) => {
  try {
    await deleteDoc(doc(db, collectionPath, id));
  } catch (e) {
    console.error("Error deleting document: ", e);
    throw e;
  }
};
