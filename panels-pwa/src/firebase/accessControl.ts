/**
 * This module centralizes all access control logic.
 * It can be used by both frontend components and backend security rules.
 */

import type { User } from 'firebase/auth';

// Define your roles here
export type Role = 'admin' | 'user' | 'pending';

export const canReadUsers = (user: User | null) => {
  // For now, only authenticated users can read the users collection.
  // You can expand this with more complex logic, e.g., checking for an 'admin' role.
  return !!user;
};

export const canWriteUsers = (user: User | null) => {
  // For now, only authenticated users can write to the users collection.
  return !!user;
};
