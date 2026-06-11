import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: any) {
    // If token is missing, invalid, or expired, fall back to guest user
    if (err || !user) {
      return { userId: 'anonymous', email: 'guest@paylens.local' };
    }
    return user;
  }
}
