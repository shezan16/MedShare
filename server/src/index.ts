import http from 'http';
import { createApp } from './app';
import { ENV } from './config/env';
import { socketService } from './services/socketService';

const app = createApp();
const server = http.createServer(app);

// Initialize Socket.IO
socketService.init(server);

const PORT = parseInt(ENV.PORT, 10) || 5000;

server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 MedShare – RapidBlood Network Server is running`);
  console.log(`📡 Listening on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO connected & ready`);
  console.log(`🤖 AI Microservice URL: ${ENV.AI_SERVICE_URL}`);
  console.log(`Environment: ${ENV.NODE_ENV}`);
  console.log(`===================================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});
