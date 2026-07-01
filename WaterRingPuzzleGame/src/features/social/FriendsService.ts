/**
 * FriendsService — Firebase Firestore-backed social friends feature.
 *
 * Handles sending/accepting/declining friend requests, managing the
 * bi-directional friends graph, searching users, and querying pending
 * requests — all backed by Firestore with Cloud Functions for heavy
 * write operations.
 *
 * Firestore schema:
 *   friendRequests/{toUserId}_{fromUserId}   — FriendRequest document
 *   friends/{userId}/friendsList/{friendId}  — Friend document
 *   users/{userId}                           — User profile document
 *
 * Requirements: 8.1, social graph
 */

import firestore from '@react-native-firebase/firestore';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface FriendRequest {
  fromUserId: string;
  toUserId: string;
  fromDisplayName: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'declined';
}

export interface Friend {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  country: string;
  mutualChallengesCompleted: number;
}

// ---------------------------------------------------------------------------
// FriendsService class
// ---------------------------------------------------------------------------

export class FriendsService {
  private static _instance: FriendsService | null = null;

  // Singleton accessor
  static getInstance(): FriendsService {
    if (!FriendsService._instance) {
      FriendsService._instance = new FriendsService();
    }
    return FriendsService._instance;
  }

  // ── sendFriendRequest ────────────────────────────────────────────────────

  /**
   * Creates a friend request document in Firestore.
   * Document key: `{toUserId}_{fromUserId}`
   */
  async sendFriendRequest(
    fromUserId: string,
    toUserId: string,
    fromDisplayName: string,
  ): Promise<void> {
    try {
      const docId = `${toUserId}_${fromUserId}`;
      const request: FriendRequest = {
        fromUserId,
        toUserId,
        fromDisplayName,
        timestamp: Date.now(),
        status: 'pending',
      };

      await firestore()
        .collection('friendRequests')
        .doc(docId)
        .set(request);
    } catch (err) {
      if (__DEV__) console.warn('[FriendsService] sendFriendRequest failed:', err);
      throw err;
    }
  }

  // ── acceptFriendRequest ──────────────────────────────────────────────────

  /**
   * Accepts a pending friend request:
   *  1. Updates the request document status to 'accepted'.
   *  2. Writes a Friend entry in both users' `friendsList` subcollections.
   */
  // eslint-disable-next-line max-lines-per-function
  async acceptFriendRequest(
    myUserId: string,
    fromUserId: string,
  ): Promise<void> {
    try {
      const docId = `${myUserId}_${fromUserId}`;

      // 1. Fetch the request to get the sender's display name.
      const requestSnap = await firestore()
        .collection('friendRequests')
        .doc(docId)
        .get();

      const requestData = requestSnap.data() as FriendRequest | undefined;

      // 2. Mark the request as accepted.
      await firestore()
        .collection('friendRequests')
        .doc(docId)
        .update({ status: 'accepted' });

      // 3. Fetch both user profiles to populate the Friend documents.
      const [mySnap, theirSnap] = await Promise.all([
        firestore().collection('users').doc(myUserId).get(),
        firestore().collection('users').doc(fromUserId).get(),
      ]);

      const myData = mySnap.data() ?? {};
      const theirData = theirSnap.data() ?? {};

      // 4. Write bi-directional friendsList entries.
      const batch = firestore().batch();

      const myFriendEntry: Friend = {
        userId: fromUserId,
        displayName: requestData?.fromDisplayName ?? theirData.displayName ?? '',
        username: theirData.username ?? '',
        avatarUrl: theirData.avatarUrl ?? null,
        country: theirData.country ?? '',
        mutualChallengesCompleted: 0,
      };

      const theirFriendEntry: Friend = {
        userId: myUserId,
        displayName: myData.displayName ?? '',
        username: myData.username ?? '',
        avatarUrl: myData.avatarUrl ?? null,
        country: myData.country ?? '',
        mutualChallengesCompleted: 0,
      };

      batch.set(
        firestore()
          .collection('friends')
          .doc(myUserId)
          .collection('friendsList')
          .doc(fromUserId),
        myFriendEntry,
      );

      batch.set(
        firestore()
          .collection('friends')
          .doc(fromUserId)
          .collection('friendsList')
          .doc(myUserId),
        theirFriendEntry,
      );

      await batch.commit();
    } catch (err) {
      if (__DEV__) console.warn('[FriendsService] acceptFriendRequest failed:', err);
      throw err;
    }
  }

  // ── declineFriendRequest ─────────────────────────────────────────────────

  /**
   * Updates the friend request status to 'declined'.
   */
  async declineFriendRequest(
    myUserId: string,
    fromUserId: string,
  ): Promise<void> {
    try {
      const docId = `${myUserId}_${fromUserId}`;
      await firestore()
        .collection('friendRequests')
        .doc(docId)
        .update({ status: 'declined' });
    } catch (err) {
      if (__DEV__) console.warn('[FriendsService] declineFriendRequest failed:', err);
      throw err;
    }
  }

  // ── removeFriend ─────────────────────────────────────────────────────────

  /**
   * Removes a friendship by deleting the Friend document from both users'
   * `friendsList` subcollections.
   */
  async removeFriend(
    myUserId: string,
    friendUserId: string,
  ): Promise<void> {
    try {
      const batch = firestore().batch();

      batch.delete(
        firestore()
          .collection('friends')
          .doc(myUserId)
          .collection('friendsList')
          .doc(friendUserId),
      );

      batch.delete(
        firestore()
          .collection('friends')
          .doc(friendUserId)
          .collection('friendsList')
          .doc(myUserId),
      );

      await batch.commit();
    } catch (err) {
      if (__DEV__) console.warn('[FriendsService] removeFriend failed:', err);
      throw err;
    }
  }

  // ── getFriends ───────────────────────────────────────────────────────────

  /**
   * Returns all friends for `userId` from the `friendsList` subcollection.
   */
  async getFriends(userId: string): Promise<Friend[]> {
    try {
      const snap = await firestore()
        .collection('friends')
        .doc(userId)
        .collection('friendsList')
        .get();

      return snap.docs.map((doc) => doc.data() as Friend);
    } catch (err) {
      if (__DEV__) console.warn('[FriendsService] getFriends failed:', err);
      throw err;
    }
  }

  // ── getPendingRequests ───────────────────────────────────────────────────

  /**
   * Returns all pending friend requests sent TO `userId`.
   */
  async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    try {
      const snap = await firestore()
        .collection('friendRequests')
        .where('toUserId', '==', userId)
        .where('status', '==', 'pending')
        .get();

      return snap.docs.map((doc) => doc.data() as FriendRequest);
    } catch (err) {
      if (__DEV__) console.warn('[FriendsService] getPendingRequests failed:', err);
      throw err;
    }
  }

  // ── searchUsers ──────────────────────────────────────────────────────────

  /**
   * Searches the `users` collection for accounts whose username starts with
   * `query` (case-sensitive prefix match via Firestore range query).
   *
   * @param query  - Username prefix to search.
   * @param limit  - Maximum results to return (default 20).
   */
  async searchUsers(
    query: string,
    limit = 20,
  ): Promise<{ userId: string; displayName: string; username: string }[]> {
    try {
      // Firestore prefix search: username >= query AND username <= query + ''
      const snap = await firestore()
        .collection('users')
        .where('username', '>=', query)
        .where('username', '<=', query + '')
        .limit(limit)
        .get();

      return snap.docs.map((doc) => {
        const data = doc.data();
        return {
          userId: doc.id,
          displayName: data.displayName ?? '',
          username: data.username ?? '',
        };
      });
    } catch (err) {
      if (__DEV__) console.warn('[FriendsService] searchUsers failed:', err);
      throw err;
    }
  }

  // ── isFriend ─────────────────────────────────────────────────────────────

  /**
   * Returns true if `targetUserId` is in `myUserId`'s friendsList.
   */
  async isFriend(myUserId: string, targetUserId: string): Promise<boolean> {
    try {
      const doc = await firestore()
        .collection('friends')
        .doc(myUserId)
        .collection('friendsList')
        .doc(targetUserId)
        .get();

      return doc.exists;
    } catch (err) {
      if (__DEV__) console.warn('[FriendsService] isFriend failed:', err);
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Default export — convenience singleton accessor
// ---------------------------------------------------------------------------

export default FriendsService.getInstance();
