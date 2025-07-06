import { Express } from 'express-serve-static-core';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
        username: string;
        email: string;
      };
    }
  }
}

export {}; 