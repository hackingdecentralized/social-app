import {type AtpAgent} from '@atproto/api'

import {logger} from '#/logger'

const PRIVATE_KEY_PREFIX = 'var:verifier-key:private:'
const PUBLIC_KEY_PREFIX = 'var:verifier-key:public:'

function toBase64(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes)
  let binary = ''
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i])
  }
  return btoa(binary)
}

async function exportVerifierPublicKey(publicKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', publicKey)
  return toBase64(raw)
}

export async function ensureVarVerifierKeypair(
  agent: AtpAgent,
): Promise<string | null> {
  try {
    const did = agent.session?.did
    if (!did) return null

    const privateStorageKey = `${PRIVATE_KEY_PREFIX}${did}`
    const publicStorageKey = `${PUBLIC_KEY_PREFIX}${did}`
    const existingPublic = localStorage.getItem(publicStorageKey)
    if (existingPublic) {
      return existingPublic
    }

    const keyPair = await crypto.subtle.generateKey({name: 'Ed25519'}, true, [
      'sign',
      'verify',
    ])

    const privatePkcs8 = await crypto.subtle.exportKey(
      'pkcs8',
      keyPair.privateKey,
    )
    const publicRawB64 = await exportVerifierPublicKey(keyPair.publicKey)

    localStorage.setItem(privateStorageKey, toBase64(privatePkcs8))
    localStorage.setItem(publicStorageKey, publicRawB64)
    return publicRawB64
  } catch (err) {
    logger.error('verifier keypair: failed to initialize local keypair', {
      message: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}
