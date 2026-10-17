import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { buildApp } from '../helpers/testApp.js'

describe('health and error envelope', () => {
  it('GET /api/health reports ok', async () => {
    const res = await request(buildApp()).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.status).toBe('ok')
    expect(typeof res.body.timestamp).toBe('string')
  })

  it('returns the standard envelope for an unknown route', async () => {
    const res = await request(buildApp()).get('/api/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'ROUTE_NOT_FOUND' },
    })
  })

  it('rejects malformed JSON bodies with a safe error', async () => {
    const res = await request(buildApp())
      .post('/api/auth/logout')
      .set('Origin', 'http://localhost:5173')
      .set('Content-Type', 'application/json')
      .send('{"broken"')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_JSON')
  })
})
