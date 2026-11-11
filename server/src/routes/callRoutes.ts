import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { callService } from '../services/callService.js';
import { scheduleService } from '../services/scheduleService.js';
import { authService } from '../services/authService.js';
import { pushService } from '../services/pushService.js';
import { config } from '../config.js';
import { db } from '../database.js';

const router = Router();

// All call routes require authentication
router.use(authenticateToken);

// POST /api/calls/initiate (Student only)
router.post('/initiate', requireRole(['student']), (req: Request, res: Response) => {
  try {
    const studentUid = req.user!.uid;
    const { parentUid } = req.body;

    if (!parentUid) {
      res.status(400).json({ success: false, message: 'parentUid is required.' });
      return;
    }

    const session = callService.initiateCall(studentUid, parentUid);
    res.json({
      success: true,
      message: 'Call initiated successfully.',
      session
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/calls/accept (Parent only)
router.post('/accept', requireRole(['parent']), (req: Request, res: Response) => {
  try {
    const parentUid = req.user!.uid;
    const { callId } = req.body;

    if (!callId) {
      res.status(400).json({ success: false, message: 'callId is required.' });
      return;
    }

    const result = callService.acceptCall(callId, parentUid);
    res.json({
      success: true,
      message: 'Call accepted.',
      result
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/calls/reject (Parent only)
router.post('/reject', requireRole(['parent']), (req: Request, res: Response) => {
  try {
    const parentUid = req.user!.uid;
    const { callId, reason } = req.body;

    if (!callId) {
      res.status(400).json({ success: false, message: 'callId is required.' });
      return;
    }

    const result = callService.rejectCall(callId, parentUid, reason);
    res.json({
      success: true,
      message: 'Call rejected.',
      result
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/calls/end (Both student and parent)
router.post('/end', (req: Request, res: Response) => {
  try {
    const userUid = req.user!.uid;
    const { callId, reason } = req.body;

    if (!callId) {
      res.status(400).json({ success: false, message: 'callId is required.' });
      return;
    }

    const result = callService.endCall(callId, userUid, reason);
    res.json({
      success: true,
      message: 'Call ended.',
      result
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/calls/history
router.get('/history', (req: Request, res: Response) => {
  try {
    const userUid = req.user!.uid;
    const role = req.user!.role;
    const history = callService.getCallHistory(userUid, role);
    res.json({
      success: true,
      history
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/calls/availability (Checks student schedule permission and parent status)
router.get('/availability', (req: Request, res: Response) => {
  try {
    const studentUid = req.user!.uid;
    const parentUid = req.query.parentUid as string | undefined;

    const scheduleCheck = scheduleService.checkCallingPermission(studentUid);

    let isParentOnline = false;
    let parentName = '';
    let isLinked = false;

    if (parentUid) {
      isLinked = authService.verifyRelationship(studentUid, parentUid);
      const parentUser = db.prepare(`SELECT name, is_online FROM users WHERE uid = ?`).get(parentUid) as any;
      if (parentUser) {
        parentName = parentUser.name;
        isParentOnline = Boolean(parentUser.is_online);
      }
    }

    res.json({
      success: true,
      schedule: scheduleCheck,
      parent: parentUid ? {
        uid: parentUid,
        name: parentName,
        isOnline: isParentOnline,
        isLinked
      } : null,
      canCallNow: scheduleCheck.isAllowed && (!parentUid || isLinked)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/calls/ice-servers
router.get('/ice-servers', (req: Request, res: Response) => {
  res.json({
    success: true,
    iceServers: config.iceServers
  });
});

// POST /api/calls/push-subscribe
router.post('/push-subscribe', (req: Request, res: Response) => {
  try {
    const userUid = req.user!.uid;
    const { subscription } = req.body;
    pushService.saveSubscription(userUid, subscription);
    res.json({ success: true, message: 'Push subscription stored successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/calls/vapid-public-key
router.get('/vapid-public-key', (req: Request, res: Response) => {
  res.json({
    success: true,
    publicKey: pushService.getPublicKey()
  });
});

export default router;

