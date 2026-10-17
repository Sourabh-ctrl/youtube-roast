import { MongoClient } from 'mongodb'

export async function connectDatabase({ uri, dbName, timeoutMs = 5000 }) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: timeoutMs })

  try {
    await client.connect()
    await client.db(dbName).command({ ping: 1 })
    return client
  } catch (error) {
    await client.close().catch(() => {})
    throw error
  }
}
