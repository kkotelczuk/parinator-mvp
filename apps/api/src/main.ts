import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createServer } from 'node:net';
import { AppModule } from './app.module';

const DEFAULT_PORT = 3001;
const MAX_PORT_ATTEMPTS = 20;

function parseConfiguredPort(value: string | undefined): number {
  const parsedPort = Number.parseInt(value ?? `${DEFAULT_PORT}`, 10);
  return Number.isNaN(parsedPort) ? DEFAULT_PORT : parsedPort;
}

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const server = createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });
    server.listen(port, '::');
  });
}

async function findAvailablePort(startPort: number): Promise<number> {
  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt += 1) {
    const currentPort = startPort + attempt;
    const hasAvailablePort = await isPortAvailable(currentPort);
    if (hasAvailablePort) {
      return currentPort;
    }
  }
  throw new Error(`Could not find free API port in range ${startPort}-${startPort + MAX_PORT_ATTEMPTS - 1}.`);
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.enableCors();
  const configuredPort = parseConfiguredPort(process.env.PORT);
  const listeningPort = await findAvailablePort(configuredPort);
  await app.listen(listeningPort);
  logger.log(`API listening on port ${listeningPort}`);
}

void bootstrap();
