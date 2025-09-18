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
    // Set custom claim immediately after creating the user record
    await admin.auth().setCustomUserClaims(user.uid, { role: "Pending" });
    console.log(`User record created and custom claim set for ${user.email} with role: Pending`);
  } catch (error) {
    console.error("Error creating user record:", error);
  }
});

export const updateUserRoleClaim = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();
    const userId = context.params.userId;

    console.log(`updateUserRoleClaim: Triggered for userId: ${userId}`);
    console.log(`updateUserRoleClaim: Previous data: ${JSON.stringify(previousValue)}`);
    console.log(`updateUserRoleClaim: New data: ${JSON.stringify(newValue)}`);

    if (newValue.role === previousValue.role) {
      console.log('updateUserRoleClaim: Role has not changed, no need to update custom claims.');
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

// Same callable with a non-blocklisted name (some ad/privacy extensions block 'admin*' paths)
export const panelCreateUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }
  const token: any = context.auth.token || {};
  const role = token.role as string | undefined;
  if (role !== 'Admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin privileges required.');
  }

  const email: string = (data?.email || '').toString().trim();
  const password: string = (data?.password || '').toString();
  const newRole: string = (data?.role || 'Pending').toString();
  const username: string = (data?.username || '').toString().trim();

  if (!email || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'Email and password are required.');
  }
  if (password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters.');
  }

  try {
    const userRecord = await admin.auth().createUser({ email, password, displayName: username || undefined, emailVerified: false, disabled: false });
    const uid = userRecord.uid;
    await admin.firestore().collection('users').doc(uid).set({
      uid,
      email,
      role: newRole,
      username: username || null,
      status: 'Active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    await admin.auth().setCustomUserClaims(uid, { role: newRole });
    return { uid };
  } catch (err: any) {
    console.error('panelCreateUser error', err);
    throw new functions.https.HttpsError('internal', err?.message || 'Failed to create user');
  }
});
