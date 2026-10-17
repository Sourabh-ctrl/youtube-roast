/**
 * Persists the minimal user profile on sign-in. The store is bound at boot
 * when MongoDB is available; without it this is a no-op so tests and
 * credential-free development still work.
 */
const NOOP_STORE = {
  async upsert() {},
}

let activeStore = NOOP_STORE

export function configureUserStore(store) {
  activeStore = store ?? NOOP_STORE
}

export function recordUser(identity) {
  return activeStore.upsert(identity)
}
