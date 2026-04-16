import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, PrismaHealthIndicator } from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service'; 
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Health Check')
@SkipThrottle() // Health check is used by monitoring tools — skip rate limiting
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator, //Built-in Prisma tool
    private prisma: PrismaService,
  ) {}

  @ApiOperation({ summary: 'System Health Check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Pass Prisma instance to the built-in pingCheck
      () => this.prismaHealth.pingCheck('database', this.prisma, {timeout: 5000}), 
    ]);
  }
}