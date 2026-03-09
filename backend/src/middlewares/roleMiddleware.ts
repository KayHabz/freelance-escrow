import { Request, Response, NextFunction } from "express";

export const requireRole = (role: string) => {

  return (req: Request, res: Response, next: NextFunction) => {

    const user = (req as any).user;

    if (!user || user.role !== role) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
};