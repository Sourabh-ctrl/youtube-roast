/**
 * MongoDB persistence for user profiles.
 *
 * Deliberately minimal: an opaque Google subject id plus public profile fields.
 * No email, no OAuth tokens, no YouTube data — those live only in the session
 * and are never written to the profile document.
 */
export const USERS_COLLECTION = 'users'

export async function ensureUserIndexes(db) {
  await db.collection(USERS_COLLECTION).createIndex({ googleId: 1 }, { unique: true })
}

export function createMongoUserStore(db) {
  const collection = db.collection(USERS_COLLECTION)

  return {
    async upsert(identity) {
      const now = new Date()
      await collection.updateOne(
        { googleId: identity.googleId },
        {
          $set: {
            displayName: identity.displayName ?? null,
            avatarUrl: identity.avatarUrl ?? null,
            updatedAt: now,
            lastSeenAt: now,
          },
          $setOnInsert: {
            googleId: identity.googleId,
            createdAt: now,
            preferences: {},
          },
        },
        { upsert: true },
      )
    },
  }
}
