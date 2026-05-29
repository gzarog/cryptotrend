/**
 * Web Push sender using the Web Crypto API (no Node.js dependencies).
 * Implements RFC 8030 (Web Push), RFC 8291 (Message Encryption), RFC 8292 (VAPID).
 */

export interface StoredSubscription {
  endpoint: string
  keys: {
    p256dh: string // base64url-encoded uncompressed EC public key (65 bytes)
    auth: string   // base64url-encoded 16-byte auth secret
  }
}

export interface Env {
  PUSH_SUBSCRIPTIONS: KVNamespace
  ALERT_COOLDOWNS: KVNamespace
  EMAIL_SUBSCRIPTIONS: KVNamespace
  RESEND_API_KEY: string
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  VAPID_SUBJECT: string
  DEV_USER_EMAIL?: string  // local dev only — falls back when CF Access header is absent
}

// ─── Base64url helpers ───────────────────────────────────────────────────────

function b64uDecode(b64u: string): Uint8Array {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    b64u.length + ((4 - (b64u.length % 4)) % 4),
    '='
  )
  const bin = atob(b64)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

function b64uEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// ─── VAPID JWT ───────────────────────────────────────────────────────────────

async function importVapidPrivateKey(privKeyB64u: string, pubKeyB64u: string): Promise<CryptoKey> {
  const pub = b64uDecode(pubKeyB64u) // 65 bytes: 0x04 || x (32) || y (32)
  const x = pub.slice(1, 33)
  const y = pub.slice(33, 65)
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    d: privKeyB64u,
    x: b64uEncode(x),
    y: b64uEncode(y),
  }
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

async function buildVapidToken(endpoint: string, env: Env): Promise<string> {
  const origin = new URL(endpoint).origin
  const now = Math.floor(Date.now() / 1000)
  const enc = new TextEncoder()

  const header = b64uEncode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = b64uEncode(enc.encode(JSON.stringify({ aud: origin, exp: now + 43200, sub: env.VAPID_SUBJECT })))
  const unsigned = `${header}.${claims}`

  const key = await importVapidPrivateKey(env.VAPID_PRIVATE_KEY, env.VAPID_PUBLIC_KEY)
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned))
  return `${unsigned}.${b64uEncode(new Uint8Array(sig))}`
}

// ─── RFC 8291 Payload Encryption ─────────────────────────────────────────────

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<CryptoKey> {
  const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveKey', 'deriveBits'])
  // HKDF-Extract is implemented as HKDF with length = hash output size
  const prk = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: new Uint8Array(0) },
    ikmKey,
    256
  )
  return crypto.subtle.importKey('raw', prk, 'HKDF', false, ['deriveKey', 'deriveBits'])
}

async function hkdfExpand(prk: CryptoKey, info: Uint8Array, length: number): Promise<Uint8Array> {
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info },
    prk,
    length * 8
  )
  return new Uint8Array(bits)
}

async function encryptPayload(
  sub: StoredSubscription,
  plaintext: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const enc = new TextEncoder()
  const clientPublicKeyBytes = b64uDecode(sub.keys.p256dh) // 65-byte uncompressed
  const authSecret = b64uDecode(sub.keys.auth)             // 16 bytes

  // Import client's public key
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  )

  // Generate ephemeral server key pair
  const serverKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  )

  // ECDH shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    serverKeyPair.privateKey,
    256
  )
  const sharedSecret = new Uint8Array(sharedSecretBits)

  // Random 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // RFC 8291 key derivation
  // key_info = "WebPush: info\x00" || ua_public || as_public
  const keyInfoData = new Uint8Array([
    ...enc.encode('WebPush: info\x00'),
    ...clientPublicKeyBytes,
    ...serverPublicKeyRaw,
  ])

  // ikm via HKDF-Extract(salt=auth_secret, ikm=shared_secret) then HKDF-Expand(info=key_info, len=32)
  const prk = await hkdfExtract(authSecret, sharedSecret)
  const ikm = await hkdfExpand(prk, keyInfoData, 32)

  // Content encryption key and nonce
  const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const cekInfo = enc.encode('Content-Encoding: aes128gcm\x00')
  const nonceInfo = enc.encode('Content-Encoding: nonce\x00')

  const cekBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo }, ikmKey, 128)
  const nonceBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, ikmKey, 96)

  const cek = await crypto.subtle.importKey('raw', cekBits, 'AES-GCM', false, ['encrypt'])

  // Pad plaintext with \x02 delimiter (RFC 8291 §4)
  const padded = new Uint8Array([...enc.encode(plaintext), 0x02])
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBits }, cek, padded)

  // Build aes128gcm content-encoding body: salt(16) || rs(4, BE) || keyid_len(1) || keyid || ciphertext
  const rs = 4096
  const rsBytes = new Uint8Array(4)
  new DataView(rsBytes.buffer).setUint32(0, rs, false)
  const keyId = serverPublicKeyRaw
  const header = new Uint8Array([...salt, ...rsBytes, keyId.length, ...keyId])
  const ciphertext = new Uint8Array([...header, ...new Uint8Array(encrypted)])

  return { ciphertext, salt, serverPublicKey: serverPublicKeyRaw }
}

// ─── Public: send a push notification ────────────────────────────────────────

export interface PushPayload {
  title: string
  body: string
  tag?: string
  url?: string
}

export async function sendPush(sub: StoredSubscription, payload: PushPayload, env: Env): Promise<boolean> {
  try {
    const vapidToken = await buildVapidToken(sub.endpoint, env)
    const { ciphertext } = await encryptPayload(sub, JSON.stringify(payload))

    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `vapid t=${vapidToken},k=${env.VAPID_PUBLIC_KEY}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        TTL: '86400',
        Urgency: 'normal',
      },
      body: ciphertext,
    })

    if (res.status === 410 || res.status === 404) {
      // Subscription expired — caller should remove it
      return false
    }

    return res.ok
  } catch (err) {
    console.error('sendPush error:', err)
    return false
  }
}
