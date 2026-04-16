import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix for all API routes (For Nginx Reverse Proxy)
  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({
    transform: true //It allows @Type() to work. allows automatic transformation of payloads to the expected types defined in DTOs, enabling features like @Type() to convert string inputs to numbers or dates before validation.
  }));

  const config = new DocumentBuilder()
    .setTitle('Hotel Booking System API')
    .setDescription('API documentation for the Hotel Booking System, Include information about the Room and Booking management APIs.')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Use: Authorization: Bearer <access_token>',
        in: 'header',
      },
      'access-token', // Security name used in decorators
    )
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
