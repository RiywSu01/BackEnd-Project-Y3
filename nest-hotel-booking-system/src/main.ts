import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
     transform: true //It allows @Type() to work. allows automatic transformation of payloads to the expected types defined in DTOs, enabling features like @Type() to convert string inputs to numbers or dates before validation.
  }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
