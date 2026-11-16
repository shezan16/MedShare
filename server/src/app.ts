import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes';
import donorRoutes from './routes/donor.routes';
import bloodRequestRoutes from './routes/bloodRequest.routes';
import medicineRoutes from './routes/medicine.routes';
import pharmacyRoutes from './routes/pharmacy.routes';
import adminRoutes from './routes/admin.routes';
import notificationRoutes from './routes/notification.routes';
import aiRoutes from './routes/ai.routes';
import { errorHandler } from './middlewares/error';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Rate Limiting (100 requests per 15 minutes per IP)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { message: 'Too many requests, please try again later.' } },
  });
  app.use('/api', limiter);

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Health check
  app.get(['/health', '/api/v1/health'], (req, res) => {
    res.json({
      status: 'healthy',
      service: 'MedShare – RapidBlood Network Backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // REST API Routes (Versioned v1)
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/donors', donorRoutes);
  app.use('/api/v1/blood-requests', bloodRequestRoutes);
  app.use('/api/v1/medicines', medicineRoutes);
  app.use('/api/v1/pharmacies', pharmacyRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/ai', aiRoutes);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
