import './load-env';

import { serve } from '@hono/node-server';

import { createApp } from './app';
import { getAppConfig } from './config';
import { createAppDependencies } from './runtime';

const config = getAppConfig();
const dependencies = await createAppDependencies(config);
const app = createApp(config, dependencies);

serve({
  fetch: app.fetch,
  port: config.port,
});

console.log(`forward api listening on http://localhost:${config.port}`);
