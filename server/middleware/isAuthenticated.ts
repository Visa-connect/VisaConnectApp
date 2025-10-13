import { Request, Response, NextFunction } from 'express';
import { Auth } from 'firebase-admin/auth';

const isAuthenticated =
  (auth: Auth) => async (req: Request, res: Response, next: NextFunction) => {
    console.log('isAuthenticated');
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decodedToken = await auth.verifyIdToken(token);
      (req as any).user = decodedToken;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
  };

export { isAuthenticated };
