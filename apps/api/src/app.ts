import 'dotenv/config';

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { courseRouter } from '$src/routes/course/course';
import { logger } from 'hono/logger';
import { mailRouter } from '$src/routes/mail';
import { prettyJSON } from 'hono/pretty-json';
import { rateLimiterMiddleware } from '$src/middlewares/rate-limiter';
import { secureHeaders } from 'hono/secure-headers';
import { env } from '$src/config/env';
import { serve } from '@hono/node-server';
import { showRoutes } from 'hono/dev';
import { configureOpenAPI } from '$src/utils/openapi';

// Create Hono app with chaining for RPC support
export const app = new Hono()
  // Middleware
  .use('*', logger())
  .use('*', prettyJSON())
  .use('*', secureHeaders())
  .use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
      maxAge: 600,
      credentials: true
    })
  )
  // .use('*', rateLimiterMiddleware)

  // Routes
  .get('/', (c) =>
    c.json({
      message: '"Welcome to classroom.verifyhalal.com API"'
    })
  )
  .route('/course', courseRouter)
  .route('/mail', mailRouter)

  // Error handling
  .onError((err, c) => {
    console.error('Error:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
  });

  // Start server
  const port = env.PORT ? parseInt(env.PORT) : 3002;

  // hono serve() expects port to be a number but if you deploy to Azure with Windows as the OS,
  // you will find port is a string and not a number. Which will cause this not to work
  // the hack is to use this code below after building and deploy to Azure
  // const port = env.PORT || 3002;
  
  function startServer() {
    console.log('Starting server...');
  
    serve({ fetch: app.fetch, port });
  
    showRoutes(app, { colorize: true });
  }
  
  configureOpenAPI(app);
  
  startServer();
