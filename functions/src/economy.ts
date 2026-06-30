import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreditCoinsData {
  amount: number;
  source: string;
  txId: string;
  hmacSignature: string;
}

interface SpendCoinsData {
  amount: number;
  sink: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getServerSalt(): Promise<string> {
  try {
    const rc = admin.remoteConfig();
    const template = await rc.getTemplate();
    const param = template.parameters['economy_hmac_salt'];
    if (param?.defaultValue && 'value' in param.defaultValue) {
      return param.defaultValue.value as string;
    }
  } catch {
    // fall through to env fallback
  }
  return process.env.ECONOMY_HMAC_SALT ?? 'water-ring-economy-v1';
}

function verifyHmac(payload: string, signature: string, salt: string): boolean {
  const expected = crypto
    .createHmac('sha256', salt)
    .update(payload)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// creditCoins
// ---------------------------------------------------------------------------

export const creditCoins = functions.https.onCall(
  async (data: CreditCoinsData, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const userId = context.auth.uid;
    const { amount, source, txId, hmacSignature } = data;

    // --- Validate inputs ---
    if (typeof amount !== 'number' || amount < 0) {
      throw new functions.https.HttpsError('invalid-argument', 'amount must be >= 0.');
    }
    if (amount > 10000) {
      throw new functions.https.HttpsError('invalid-argument', 'amount exceeds 10000 per call limit.');
    }
    if (!source || typeof source !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'source is required.');
    }
    if (!txId || typeof txId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'txId is required.');
    }

    // --- HMAC verification ---
    const salt = await getServerSalt();
    const payload = `${userId}:${amount}:${source}:${txId}`;
    if (!verifyHmac(payload, hmacSignature, salt)) {
      throw new functions.https.HttpsError('permission-denied', 'Invalid HMAC signature.');
    }

    // --- Idempotency check ---
    const txRef = db.collection('transactions').doc(txId);
    const txSnap = await txRef.get();
    if (txSnap.exists) {
      // Already processed — return success silently
      return { success: true, idempotent: true };
    }

    // --- Atomic update ---
    await db.runTransaction(async (tx) => {
      // Re-check inside transaction
      const txDocInTx = await tx.get(txRef);
      if (txDocInTx.exists) return;

      const userRef = db.collection('users').doc(userId);
      tx.set(
        userRef,
        { coinBalance: admin.firestore.FieldValue.increment(amount) },
        { merge: true },
      );
      tx.set(txRef, {
        userId,
        amount,
        source,
        type: 'credit',
        createdAt: Date.now(),
      });
    });

    return { success: true, idempotent: false };
  },
);

// ---------------------------------------------------------------------------
// spendCoins
// ---------------------------------------------------------------------------

export const spendCoins = functions.https.onCall(
  async (data: SpendCoinsData, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const userId = context.auth.uid;
    const { amount, sink } = data;

    if (typeof amount !== 'number' || amount <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'amount must be > 0.');
    }
    if (!sink || typeof sink !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'sink is required.');
    }

    const userRef = db.collection('users').doc(userId);

    let newBalance = 0;
    let success = false;
    let reason: string | undefined;

    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      const currentBalance: number = (userSnap.data() ?? {})['coinBalance'] ?? 0;

      if (currentBalance < amount) {
        success = false;
        reason = 'insufficient_balance';
        return;
      }

      newBalance = currentBalance - amount;
      success = true;

      tx.set(
        userRef,
        { coinBalance: admin.firestore.FieldValue.increment(-amount) },
        { merge: true },
      );

      const spendTxRef = db.collection('transactions').doc();
      tx.set(spendTxRef, {
        userId,
        amount,
        sink,
        type: 'debit',
        createdAt: Date.now(),
      });
    });

    if (!success) {
      return { success: false, reason: reason ?? 'insufficient_balance' };
    }

    return { success: true, newBalance };
  },
);
