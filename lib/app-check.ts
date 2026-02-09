/**
 * Firebase App Check Configuration
 * ป้องกัน Bot หรือเว็บอื่นแอบยิง API เข้า Firebase (ลดค่าใช้จ่ายและ abuse)
 *
 * วิธีเปิดใช้:
 * 1. เปิด App Check ใน Firebase Console > App Check
 * 2. ลงทะเบียนแอปด้วย reCAPTCHA v3 provider
 * 3. ตั้งค่า NEXT_PUBLIC_RECAPTCHA_SITE_KEY ใน .env
 * 4. เปิด Enforcement สำหรับ Firestore/Auth ใน Console ตามต้องการ
 */

import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import type { AppCheck } from 'firebase/app-check'
import { getFirebaseApp } from './firebase'

let appCheck: AppCheck | null = null

/**
 * Initialize Firebase App Check
 * Only runs on client-side
 */
export function initializeFirebaseAppCheck(): AppCheck | null {
  // Only initialize in browser
  if (typeof window === 'undefined') {
    return null
  }

  // Already initialized
  if (appCheck) {
    return appCheck
  }

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  if (!siteKey) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[App Check] No reCAPTCHA site key configured, skipping initialization')
    }
    return null
  }

  try {
    appCheck = initializeAppCheck(getFirebaseApp(), {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    })

    if (process.env.NODE_ENV === 'development') console.log('[App Check] Initialized successfully')
    return appCheck
  } catch (error) {
    console.error('[App Check] Initialization failed:', error)
    return null
  }
}

/**
 * Get the current App Check instance
 */
export function getAppCheck(): AppCheck | null {
  return appCheck
}
