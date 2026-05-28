'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');

const logger = require('./utils/logger');
const cache = require('./utils/cache');
const { validateEnv } = require('./utils/validation');

// Step 1: Validate Environment Variables on boot
const env = validateEnv();

// Import API routes (updated to deep folder routes)
const matchesRouter = require('./api/routes/matches');
const leaguesRouter = require('./api/routes/leagues');
const teamsRouter = require('./api/routes/teams');
const predictionsRouter = require('./api/routes/predictions');
const usersRouter = require('./api/routes/users');
const authRouter = require('./api/routes/auth');
const commentsRouter = require('./api/routes/comments');
const reactionsRouter = require('./api/routes/reactions');
const insightsRouter = require('./api/routes/insights');
const systemRouter = require('./api/routes/system');

const app = express();
const PORT = env.PORT;
const API_VERSION = env.API_VERSION;

// Enable request parsing
app.use(express.json({ limit: '10kb' })); // protect against large payloads
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 1. Compression Middleware
app.use(compression());

// 2. Helmet Security Headers Middleware
app.use(helmet({
  contentSecurityPolicy: false // disabled to allow local dev dashboard preview/Google fonts easily
}));

// 3. CORS Middleware
app.use(cors({
  origin: '*', // restrict in production to target app bundle origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// HTTP request logging
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Serve Static Dashboard UI
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard')));

// 4. Rate Limiting Middleware
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ---- API Route Registrations ----
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV
  });
});

app.use(`/api/${API_VERSION}/matches`, matchesRouter);
app.use(`/api/${API_VERSION}/leagues`, leaguesRouter);
app.use(`/api/${API_VERSION}/teams`, teamsRouter);
app.use(`/api/${API_VERSION}/predictions`, predictionsRouter);
app.use(`/api/${API_VERSION}/users`, usersRouter);
app.use(`/api/${API_VERSION}/users`, authRouter);
app.use(`/api/${API_VERSION}/matches`, commentsRouter);
app.use(`/api/${API_VERSION}/reactions`, reactionsRouter);
app.use(`/api/${API_VERSION}/insights`, insightsRouter);
app.use(`/api/${API_VERSION}/system`, systemRouter);

// Fallback for unhandled endpoints
app.use((req, res, next) => {
  res.status(404).json({
    error: `Endpoint not found: ${req.originalUrl}`,
    code: 'NOT_FOUND'
  });
});

// 5. Centralized Error Handler Middleware
app.use((err, req, res, next) => {
  logger.error(`API Error: ${err.message}`, { stack: err.stack, path: req.path, method: req.method });
  
  const statusCode = err.statusCode || 500;
  const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  
  res.status(statusCode).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR'
  });
});

let serverInstance = null;

// Start Server
async function startServer() {
  try {
    // Connect Cache Layer (automatic failover Redis -> Memory Cache is handled inside cache manager)
    await cache.initRedis();
    
    // Start real-time batch aggregation flush loop
    const batchAggregator = require('./services/batchAggregator');
    batchAggregator.start();
    
    serverInstance = app.listen(PORT, () => {
      logger.info(`✓ GoalIQ Live Backend running at http://localhost:${PORT}/api/${API_VERSION}`);
    });
  } catch (err) {
    logger.error(`❌ Server failed to start: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
}

// 6. Graceful Shutdown Handlers
function shutdownGracefully(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown procedure...`);
  
  if (serverInstance) {
    serverInstance.close(async () => {
      logger.info('HTTP server closed.');
      
      try {
        // Stop batch aggregator flush intervals
        const batchAggregator = require('./services/batchAggregator');
        batchAggregator.stop();
        logger.info('Real-time batch aggregator stopped.');
        
        logger.info('✓ Graceful shutdown completed. Exiting process.');
        process.exit(0);
      } catch (err) {
        logger.error(`Error during graceful shutdown: ${err.message}`);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
  
  // Timeout safeguard: force exit after 10s if shutdown hangs
  setTimeout(() => {
    logger.error('Graceful shutdown timeout exceeded. Force-exiting.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));
process.on('SIGINT', () => shutdownGracefully('SIGINT'));

// Catch unhandled promise rejections outside of routes
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection detected:', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception detected:', { error });
  shutdownGracefully('UNCAUGHT_EXCEPTION');
});

startServer();

module.exports = app;
