import { Role } from './enums';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: Role;
      userDisplayName?: string;
    }
  }
}

export {};
