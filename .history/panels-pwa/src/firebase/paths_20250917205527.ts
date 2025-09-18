/**
 * This module centralizes all Firestore path generation in one place.
 * All functions are pure and do not have any side-effects.
 */

// /users/{userId}
export const usersCollection = () => 'users';
export const userDocument = (userId: string) => `users/${userId}`;

// /ccis/{cciId}
export const ccisCollection = () => 'ccis';
export const cciDocument = (cciId: string) => `ccis/${cciId}`;

// /cci_user_links/{userId}
export const cciUserLinksCollection = () => 'cci_user_links';
export const cciUserLinkDocument = (userId: string) => `cci_user_links/${userId}`;

// /visits/{visitId}
export const visitsCollection = () => 'visits';
export const visitDocument = (visitId: string) => `visits/${visitId}`;

// /visits/{visitId}/events/{eventId} - Version history events
export const visitEventsCollection = (visitId: string) => `visits/${visitId}/events`;
export const visitEventDocument = (visitId: string, eventId: string) => `visits/${visitId}/events/${eventId}`;

// /visits/{visitId}/snapshots/{snapshotId} - Version snapshots
export const visitSnapshotsCollection = (visitId: string) => `visits/${visitId}/snapshots`;
export const visitSnapshotDocument = (visitId: string, snapshotId: string) => `visits/${visitId}/snapshots/${snapshotId}`;

// Add other path generation functions here as your application grows.
// For example:
// /posts/{postId}
// export const postsCollection = () => 'posts';
// export const postDocument = (postId: string) => `posts/${postId}`;
