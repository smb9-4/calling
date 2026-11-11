import { Router, Request, Response } from 'express';
import { authService } from '../services/authService.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      res.status(400).json({ success: false, message: 'Identifier and password are required' });
      return;
    }

    const result = authService.login(identifier, password);
    res.json({
      success: true,
      message: 'Login successful',
      token: result.token,
      user: result.user
    });
  } catch (error: any) {
    res.status(401).json({ success: false, message: error.message || 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const userProfile = authService.getProfile(req.user.uid);
    res.json({
      success: true,
      user: userProfile
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/auth/contacts
router.get('/contacts', authenticateToken, (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const contacts = authService.getAuthorizedContacts(req.user);
    res.json({
      success: true,
      contacts
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

