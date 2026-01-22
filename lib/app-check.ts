/**
 * Firebase App Check Configuration
 * Protects backend resources from abuse
 * 
 * Setup Instructions:
 * 1. Enable App Check in Firebase Console
 * 2. Register your app with reCAPTCHA v3 provider
 * 3. Set NEXT_PUBLIC_RECAPTCHA_SITE_KEY in environment
 * 4. Enforce App Check in Firebase Security Rules
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

    console.log('[App Check] Initialized successfully')
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
