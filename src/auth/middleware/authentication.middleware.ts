import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
  use(req: Request & { authToken?: string }, _res: Response, next: NextFunction): void {
    const authorization = req.headers.authorization;

    if (!authorization) {
      next();
      return;
    }

    if (!authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const token = authorization.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    req.authToken = token;
    next();
  }
}
