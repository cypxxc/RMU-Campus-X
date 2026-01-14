#!/usr/bin/env node
/**
 * Database Migration Framework
 * Run migrations to update Firestore schema safely
 * 
 * Usage:
 *   npx ts-node scripts/migrate.ts
 *   npx ts-node scripts/migrate.ts --dry-run
 *   npx ts-node scripts/migrate.ts --target=002
 */

import * as admin from 'firebase-admin'

interface Migration {
  id: string
  name: string
  up: (db: admin.firestore.Firestore) => Promise<void>
  down?: (db: admin.firestore.Firestore) => Promise<void>
}

// Migration definitions
const migrations: Migration[] = [
  {
    id: '001',
    name: 'add_user_status_field',
    up: async (db) => {
      console.log('  Adding status field to users without it...')
      const usersRef = db.collection('users')
      const snapshot = await usersRef.get()
      
      let updated = 0
      for (const doc of snapshot.docs) {
        if (!doc.data().status) {
          await doc.ref.update({ status: 'ACTIVE' })
          updated++
        }
      }
      console.log(`  ✓ Updated ${updated} users`)
    },
  },
  {
    id: '002',
    name: 'normalize_item_categories',
    up: async (db) => {
      console.log('  Normalizing item categories to lowercase...')
      const itemsRef = db.collection('items')
      const snapshot = await itemsRef.get()
      
      let updated = 0
      for (const doc of snapshot.docs) {
        const category = doc.data().category
        if (category && category !== category.toLowerCase()) {
          await doc.ref.update({ category: category.toLowerCase() })
          updated++
        }
      }
      console.log(`  ✓ Updated ${updated} items`)
    },
  },
  {
    id: '003',
    name: 'add_created_at_to_old_records',
    up: async (db) => {
      console.log('  Adding createdAt to records without timestamps...')
      const collections = ['items', 'exchanges', 'reports']
      
      for (const collectionName of collections) {
        const ref = db.collection(collectionName)
        const snapshot = await ref.get()
        
        let updated = 0
        for (const doc of snapshot.docs) {
          const data = doc.data()
          if (!data.createdAt && !data.postedAt) {
            await doc.ref.update({ 
              createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-01-01'))
            })
            updated++
          }
        }
        console.log(`  ✓ ${collectionName}: Updated ${updated} records`)
      }
    },
  },
  {
    id: '004',
    name: 'add_exchange_counts_to_users',
    up: async (db) => {
      console.log('  Calculating exchange counts for users...')
      const usersRef = db.collection('users')
      const exchangesRef = db.collection('exchanges')
      
      const usersSnapshot = await usersRef.get()
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id
        
        // Count exchanges where user is requester or owner
        const asRequester = await exchangesRef
          .where('requesterId', '==', userId)
          .where('status', '==', 'completed')
          .get()
        
        const asOwner = await exchangesRef
          .where('ownerId', '==', userId)
          .where('status', '==', 'completed')
          .get()
        
        const totalExchanges = asRequester.size + asOwner.size
        
        await userDoc.ref.update({
          stats: {
            ...(userDoc.data().stats || {}),
            completedExchanges: totalExchanges,
          }
        })
      }
      
      console.log(`  ✓ Updated ${usersSnapshot.size} users`)
    },
  },
]

// Initialize Firebase Admin
function initializeFirebase() {
  if (admin.apps.length > 0) {
    return admin.app()
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials')
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
}

// Get applied migrations
async function getAppliedMigrations(db: admin.firestore.Firestore): Promise<string[]> {
  const migrationsRef = db.collection('_migrations')
  const snapshot = await migrationsRef.orderBy('appliedAt').get()
  return snapshot.docs.map(doc => doc.id)
}

// Record migration as applied
async function recordMigration(
  db: admin.firestore.Firestore,
  migration: Migration
): Promise<void> {
  await db.collection('_migrations').doc(migration.id).set({
    name: migration.name,
    appliedAt: admin.firestore.FieldValue.serverTimestamp(),
  })
}

// Main migration runner
async function runMigrations() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')
  const targetArg = args.find(a => a.startsWith('--target='))
  const targetMigration = targetArg?.split('=')[1]

  console.log('🔄 Starting database migrations...\n')
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
  }

  try {
    initializeFirebase()
    const db = admin.firestore()

    const appliedMigrations = await getAppliedMigrations(db)
    console.log(`Applied migrations: ${appliedMigrations.length}`)
    console.log(`Available migrations: ${migrations.length}\n`)

    const pendingMigrations = migrations.filter(m => {
      if (appliedMigrations.includes(m.id)) return false
      if (targetMigration && m.id > targetMigration) return false
      return true
    })

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations\n')
      return
    }

    console.log(`Pending migrations: ${pendingMigrations.length}\n`)

    for (const migration of pendingMigrations) {
      console.log(`📦 Running migration ${migration.id}: ${migration.name}`)
      
      if (!isDryRun) {
        await migration.up(db)
        await recordMigration(db, migration)
      }
      
      console.log(`✅ Completed ${migration.id}\n`)
    }

    console.log('🎉 All migrations completed successfully!')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigrations()
