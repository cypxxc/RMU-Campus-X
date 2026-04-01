/**
 * Firestore Backup Restore Script
 * Restores data from a backup JSON file
 * 
 * Usage: bun run scripts/restore-firestore.ts <backup-file>
 * Example: bun run scripts/restore-firestore.ts backups/backup-2026-01-22.json
 */

import * as admin from 'firebase-admin'
import * as fs from 'fs'
import * as path from 'path'
import {
  getFirebaseAdminCredentials,
  validateFirebaseAdminPrivateKey,
} from '../lib/firebase-admin-credentials'

// Initialize Firebase Admin
if (!admin.apps.length) {
  const { projectId, clientEmail, privateKey } = getFirebaseAdminCredentials()
  validateFirebaseAdminPrivateKey(privateKey)

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
}

const db = admin.firestore()

interface BackupData {
  metadata: {
    createdAt: string
    collections: string[]
  }
  collections?: {
    [collectionName: string]: {
      [docId: string]: Record<string, unknown>
    }
  }
  data?: {
    [collectionName: string]: {
      [docId: string]: Record<string, unknown>
    }
  }
}

async function restoreCollection(
  collectionName: string,
  documents: { [docId: string]: Record<string, unknown> },
  dryRun: boolean
): Promise<number> {
  const entries = Object.entries(documents)
  let restored = 0

  console.log(`\n📁 Restoring ${collectionName} (${entries.length} documents)...`)

  for (const [docId, data] of entries) {
    if (dryRun) {
      console.log(`  [DRY RUN] Would restore: ${collectionName}/${docId}`)
    } else {
      try {
        // Convert ISO strings back to Firestore Timestamps
        const processedData = processTimestamps(data)
        await db.collection(collectionName).doc(docId).set(processedData, { merge: true })
        restored++
        
        if (restored % 50 === 0) {
          console.log(`  Progress: ${restored}/${entries.length}`)
        }
      } catch (error) {
        console.error(`  ❌ Failed to restore ${docId}:`, error)
      }
    }
  }

  return restored
}

function processTimestamps(data: Record<string, unknown>): Record<string, unknown> {
  const processed: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && isISODateString(value)) {
      // Convert ISO string back to Firestore Timestamp
      processed[key] = admin.firestore.Timestamp.fromDate(new Date(value))
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      processed[key] = processTimestamps(value as Record<string, unknown>)
    } else {
      processed[key] = value
    }
  }

  return processed
}

function isISODateString(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)
}

async function main() {
  const args = process.argv.slice(2)
  const backupFile = args[0]
  const dryRun = args.includes('--dry-run')

  if (!backupFile) {
    console.log('Usage: bun run scripts/restore-firestore.ts <backup-file> [--dry-run]')
    console.log('Example: bun run scripts/restore-firestore.ts backups/backup-2026-01-22.json')
    process.exit(1)
  }

  const filePath = path.resolve(backupFile)

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Backup file not found: ${filePath}`)
    process.exit(1)
  }

  console.log('🔄 Starting Firestore Restore')
  console.log(`📄 Backup file: ${filePath}`)
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made')
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const backup: BackupData = JSON.parse(content)

    console.log(`\n📋 Backup Info:`)
    console.log(`   Created: ${backup.metadata.createdAt}`)
    console.log(`   Collections: ${backup.metadata.collections.join(', ')}`)

    const collections = backup.collections ?? backup.data
    if (!collections) {
      throw new Error('Backup file is missing collections data')
    }

    let totalRestored = 0

    for (const [collectionName, documents] of Object.entries(collections)) {
      const restored = await restoreCollection(collectionName, documents, dryRun)
      totalRestored += restored
    }

    console.log(`\n✅ Restore complete!`)
    console.log(`   Total documents ${dryRun ? 'to restore' : 'restored'}: ${totalRestored}`)

  } catch (error) {
    console.error('❌ Restore failed:', error)
    process.exit(1)
  }
}

main()
