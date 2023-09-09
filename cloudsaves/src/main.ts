import { badRequest } from '@hapi/boom';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { allowedOrigins, mongoURI, port } from './core/config';
import { setup as setupErrorHandler } from './core/errorHandler';
import { setupPassport } from './core/auth';
import setupServices from './services';

mongoose.connect(mongoURI);

const app = express();
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: { policy: 'require-corp' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'same-site' },
}));
app.use(cors({
  origin: (origin, next) => {
    if (origin && allowedOrigins.indexOf(origin) !== -1) {
      next(null, true);
    } else {
      next(badRequest());
    }
  },
}));
app.use(express.json());
setupPassport();
setupServices(app);
setupErrorHandler(app);

const server = app.listen(port);

const shutdown = () => (
  server.close(() => (
    mongoose.connection.close()
      .then(() => (
        process.nextTick(() => process.exit(0))
      ))
  ))
);

process
  .on('SIGTERM', shutdown)
  .on('SIGINT', shutdown);
