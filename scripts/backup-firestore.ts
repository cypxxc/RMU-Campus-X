#!/usr/bin/env bun
/**
 * Firestore Backup Script
 * 
 * Usage:
 *   bun run scripts/backup-firestore.ts
 * 
 * Prerequisites:
 *   - Firebase Admin SDK credentials in .env
 */

import * as fs from 'fs'
import * as path from 'path'
import { Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '../lib/firebase-admin'

// Collections to backup
const COLLECTIONS_TO_BACKUP = [
  'users',
  'items',
  'exchanges',
  'chatMessages',
  'notifications',
  'reports',
  'supportTickets',
  'reviews',
  'favorites',
  'adminLogs',
]

// Backup a single collection
async function backupCollection(
  db: FirebaseFirestore.Firestore,
  collectionName: string
): Promise<Record<string, unknown>[]> {
  console.log(`  Backing up ${collectionName}...`)
  
  const snapshot = await db.collection(collectionName).get()
  const documents: Record<string, unknown>[] = []

  for (const doc of snapshot.docs) {
    documents.push({
      id: doc.id,
      data: doc.data(),
    })
  }

  console.log(`  ✓ ${collectionName}: ${documents.length} documents`)
  return documents
}

// Convert Firestore Timestamps to ISO strings
function convertTimestamps(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (obj instanceof Timestamp) {
    return obj.toDate().toISOString()
  }

  if (Array.isArray(obj)) {
    return obj.map(convertTimestamps)
  }

  if (typeof obj === 'object') {
    const converted: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      converted[key] = convertTimestamps(value)
    }
    return converted
  }

  return obj
}

// Main backup function
async function backup() {
  console.log('🔄 Starting Firestore backup...\n')
  
  const startTime = Date.now()
  
  try {
    // Initialize Firebase Admin using shared lib
    const db = getAdminDb()

    const backup: Record<string, unknown[]> = {}
    let totalDocuments = 0

    // Backup each collection
    for (const collection of COLLECTIONS_TO_BACKUP) {
      try {
        const documents = await backupCollection(db, collection)
        backup[collection] = documents.map(doc => convertTimestamps(doc)) as unknown[]
        totalDocuments += documents.length
      } catch (error) {
        console.error(`  ✗ Error backing up ${collection}:`, error)
      }
    }

    // Create backup directory
    const backupDir = path.join(process.cwd(), 'backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${timestamp}.json`
    const filepath = path.join(backupDir, filename)

    // Write backup file
    const backupData = {
      metadata: {
        createdAt: new Date().toISOString(),
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        collections: COLLECTIONS_TO_BACKUP,
        totalDocuments,
      },
      data: backup,
    }

    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2))

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\n✅ Backup completed successfully!`)
    console.log(`   File: ${filepath}`)
    console.log(`   Total documents: ${totalDocuments}`)
    console.log(`   Duration: ${duration}s`)

    // Create a 'latest' symlink/copy
    const latestPath = path.join(backupDir, 'backup-latest.json')
    if (fs.existsSync(latestPath)) {
      fs.unlinkSync(latestPath)
    }
    fs.copyFileSync(filepath, latestPath)

    return filepath
  } catch (error) {
    console.error('\n❌ Backup failed:', error)
    process.exit(1)
  }
}

// Run backup
backup()
