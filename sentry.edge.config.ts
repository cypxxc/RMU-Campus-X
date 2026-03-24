// This file configures the initialization of Sentry for edge runtime.
// The config you add here will be used when running in edge runtime.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://9634378cb3a65246816c4ef2d6aa8662@o4510748612886528.ingest.us.sentry.io/4510748615049218",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
