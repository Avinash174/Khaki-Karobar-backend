import app from './app';
import { ENV } from './config/env';
import prisma from './config/prisma';

const server = app.listen(ENV.PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Khaki Karobari API Server running on port ${ENV.PORT}`);
  console.log(`🏢 Company: KHAKI | KrypTech™`);
  console.log(`🌐 Base URL: http://localhost:${ENV.PORT}/api/v1`);
  console.log(`❤️  Health:   http://localhost:${ENV.PORT}/api/health`);
  console.log(`====================================================`);
});

const gracefulShutdown = async () => {
  console.log('Shutting down server gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database disconnected. Process terminated.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
