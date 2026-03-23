//This files is to implement the logic to Extracting the user's information directly from their token.
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    // 1. Get the incoming request
    const request = ctx.switchToHttp().getRequest();
    
    // 2. return just specific field (like 'id'), then return just ID.
    if (data) {
      return request.user[data];
    }
    
    // 3. Otherwise, return the whole decoded user object
    return request.user;
  },
);