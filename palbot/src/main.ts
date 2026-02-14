import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS so frontends on other origins can connect
  app.enableCors();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Palbot running on http://localhost:${port}`);
  logger.log(`  POST /chat        — sync response`);
  logger.log(`  POST /chat/stream  — SSE streaming response`);
}
bootstrap();
