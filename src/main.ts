import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/api-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  const port = Number(process.env.PORT || 80);
  // 云托管探针要求监听 0.0.0.0，不能只绑 localhost
  await app.listen(port, '0.0.0.0');
  console.log(`[bootstrap] listening on 0.0.0.0:${port}`);
}
bootstrap().catch((err) => {
  console.error('[bootstrap] failed', err);
  process.exit(1);
});
