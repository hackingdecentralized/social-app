import {type AtpAgent} from '@atproto/api'

import {logger} from '#/logger'

const PRIVATE_KEY_PREFIX = 'var:user-key:private:'
const PUBLIC_KEY_PREFIX = 'var:user-key:public:'
const COLLECTION = 'com.hackingdecentralized.var.userKey'
const RKEY = 'self'
const RECEIPT_ALG = 'x25519-chacha20poly1305-v1'
const RECEIPT_KDF_INFO = 'bluesky-var-receipt-v1'
const PUBLIC_KEY_ENCODING = 'base64-spki-der'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toBase64(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes)
  let binary = ''
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i])
  }
  return btoa(binary)
}

export async function ensureVarUserKeypair(agent: AtpAgent): Promise<void> {
  try {
    const did = agent.session?.did
    if (!did) return

    const privateStorageKey = `${PRIVATE_KEY_PREFIX}${did}`
    const publicStorageKey = `${PUBLIC_KEY_PREFIX}${did}`
    let privatePkcs8B64 = localStorage.getItem(privateStorageKey)
    let publicSpkiB64 = localStorage.getItem(publicStorageKey)
    const hadPrivateWithoutPublic = Boolean(privatePkcs8B64 && !publicSpkiB64)

    if (!privatePkcs8B64 || !publicSpkiB64) {
      const generated = await crypto.subtle.generateKey(
        {
          name: 'X25519',
        },
        true,
        ['deriveBits'],
      )
      if (!('privateKey' in generated) || !('publicKey' in generated)) {
        throw new Error('FailedToGenerateX25519Keypair')
      }
      const privatePkcs8 = await crypto.subtle.exportKey(
        'pkcs8',
        generated.privateKey,
      )
      const publicSpki = await crypto.subtle.exportKey(
        'spki',
        generated.publicKey,
      )
      privatePkcs8B64 = toBase64(privatePkcs8)
      publicSpkiB64 = toBase64(publicSpki)
      localStorage.setItem(privateStorageKey, privatePkcs8B64)
      localStorage.setItem(publicStorageKey, publicSpkiB64)

      if (
        !localStorage.getItem(privateStorageKey) ||
        !localStorage.getItem(publicStorageKey)
      ) {
        throw new Error('FailedToPersistLocalKeypair')
      }
      if (hadPrivateWithoutPublic) {
        logger.warn(
          'var keypair: rotated keypair due to missing public key cache',
          {
            did,
          },
        )
      }
    }

    if (!privatePkcs8B64 || !publicSpkiB64) {
      throw new Error('MissingLocalKeypairAfterInit')
    }

    let shouldPublish = true
    try {
      const existing = await agent.api.com.atproto.repo.getRecord({
        repo: did,
        collection: COLLECTION,
        rkey: RKEY,
      })
      const value = existing.data.value
      if (isObject(value)) {
        const existingPublicKey =
          typeof value.publicKey === 'string' ? value.publicKey : ''
        const existingEncoding =
          typeof value.encoding === 'string' ? value.encoding : ''
        shouldPublish =
          existingPublicKey !== publicSpkiB64 ||
          existingEncoding !== PUBLIC_KEY_ENCODING
      }
    } catch {
      shouldPublish = true
    }

    if (!shouldPublish) {
      return
    }

    const now = new Date().toISOString()
    await agent.com.atproto.repo.putRecord({
      repo: did,
      collection: COLLECTION,
      rkey: RKEY,
      record: {
        $type: COLLECTION,
        algorithm: RECEIPT_ALG,
        encoding: PUBLIC_KEY_ENCODING,
        publicKey: publicSpkiB64,
        kdf: 'HKDF-SHA256',
        kdfInfo: RECEIPT_KDF_INFO,
        aead: 'CHACHA20-POLY1305',
        createdAt: now,
        updatedAt: now,
      },
    })
  } catch (err) {
    logger.error('var keypair: failed to initialize or publish keypair', {
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
