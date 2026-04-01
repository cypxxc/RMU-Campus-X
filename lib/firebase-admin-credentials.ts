export interface FirebaseAdminCredentials {
  projectId: string
  clientEmail: string
  privateKey: string
}

export function normalizeFirebaseAdminPrivateKey(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  let normalized = value.trim()
  const hasMatchingDoubleQuotes = normalized.startsWith('"') && normalized.endsWith('"')
  const hasMatchingSingleQuotes = normalized.startsWith("'") && normalized.endsWith("'")

  if (hasMatchingDoubleQuotes || hasMatchingSingleQuotes) {
    normalized = normalized.slice(1, -1)
  }

  return normalized.replace(/\\n/g, '\n')
}

export function getFirebaseAdminCredentials(): FirebaseAdminCredentials {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim()
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim()
  const privateKey = normalizeFirebaseAdminPrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY)

  const missing: string[] = []
  if (!projectId) missing.push('FIREBASE_ADMIN_PROJECT_ID')
  if (!clientEmail) missing.push('FIREBASE_ADMIN_CLIENT_EMAIL')
  if (!privateKey) missing.push('FIREBASE_ADMIN_PRIVATE_KEY')

  if (missing.length > 0) {
    throw new Error(
      `Firebase Admin SDK credentials not found. Missing: ${missing.join(', ')}`
    )
  }

  const safeProjectId = projectId as string
  const safeClientEmail = clientEmail as string
  const safePrivateKey = privateKey as string

  return {
    projectId: safeProjectId,
    clientEmail: safeClientEmail,
    privateKey: safePrivateKey,
  }
}

export function validateFirebaseAdminPrivateKey(privateKey: string): void {
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    console.error(
      'FIREBASE_ADMIN_PRIVATE_KEY is missing the standard header. ' +
      'If this came from GitHub Secrets, paste the raw key value without extra escaping.'
    )
  }

  if (privateKey.length < 100) {
    console.error('FIREBASE_ADMIN_PRIVATE_KEY is suspiciously short.')
  }
}
