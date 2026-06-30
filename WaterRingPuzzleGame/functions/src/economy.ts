import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

export const creditCoins = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to credit coins.');
  }

  const { amount, source, txId } = request.data as {
    amount: number;
    source: string;
    txId?: string;
  };

  if (!amount || amount <= 0) {
    throw new HttpsError('invalid-argument', 'amount must be > 0.');
  }
  if (amount > 10000) {
    throw new HttpsError('invalid-argument', 'amount must be <= 10000.');
  }

  const userId = request.auth.uid;
  const db = admin.firestore();
  const userRef = db.doc(`users/${userId}`);

  try {
    let newBalance = 0;

    await db.runTransaction(async (tx: admin.firestore.Transaction) => {
      const userDoc = await tx.get(userRef);
      const currentBalance: number = userDoc.exists ? (userDoc.data()?.coinBalance ?? 0) : 0;
      newBalance = currentBalance + amount;
      tx.set(userRef, { coinBalance: newBalance }, { merge: true });
    });

    const ledgerId = txId ?? db.collection(`economy/${userId}/ledger`).doc().id;
    await db.doc(`economy/${userId}/ledger/${ledgerId}`).set({
      type: 'credit',
      amount,
      source,
      txId: ledgerId,
      newBalance,
      timestamp: Date.now(),
    });

    return { newBalance, success: true };
  } catch (err) {
    throw new HttpsError('internal', `Failed to credit coins: ${(err as Error).message}`);
  }
});

export const spendCoins = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to spend coins.');
  }

  const { amount, source, itemId } = request.data as {
    amount: number;
    source: string;
    itemId?: string;
  };

  if (!amount || amount <= 0) {
    throw new HttpsError('invalid-argument', 'amount must be > 0.');
  }

  const userId = request.auth.uid;
  const db = admin.firestore();
  const userRef = db.doc(`users/${userId}`);

  try {
    let newBalance = 0;
    let insufficient = false;

    await db.runTransaction(async (tx: admin.firestore.Transaction) => {
      const userDoc = await tx.get(userRef);
      const currentBalance: number = userDoc.exists ? (userDoc.data()?.coinBalance ?? 0) : 0;

      if (currentBalance < amount) {
        insufficient = true;
        return;
      }

      newBalance = currentBalance - amount;
      tx.set(userRef, { coinBalance: newBalance }, { merge: true });
    });

    if (insufficient) {
      return { success: false, reason: 'insufficient_funds' };
    }

    const ledgerId = db.collection(`economy/${userId}/ledger`).doc().id;
    await db.doc(`economy/${userId}/ledger/${ledgerId}`).set({
      type: 'spend',
      amount,
      source,
      itemId: itemId ?? null,
      txId: ledgerId,
      newBalance,
      timestamp: Date.now(),
    });

    return { newBalance, success: true };
  } catch (err) {
    throw new HttpsError('internal', `Failed to spend coins: ${(err as Error).message}`);
  }
});
