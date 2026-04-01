import type { FullConfig } from '@playwright/test'

export default async function globalSetup(_config: FullConfig): Promise<void> {
  // Keep the hook in place for CI config resolution even when no global setup is needed yet.
}
