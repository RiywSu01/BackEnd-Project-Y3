import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default_secret_change_me',
    });
  }

  async validate(payload: { sub: number; username: string; roles: string }) {
    const user = await this.prisma.users.findUnique({
      where: { username: payload.username },
    });
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    return { id: payload.sub, username: payload.username, roles: payload.roles };
  }
}