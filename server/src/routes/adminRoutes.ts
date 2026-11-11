import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { scheduleService } from '../services/scheduleService.js';
import { callService } from '../services/callService.js';
import { db } from '../database.js';

const router = Router();

// All admin routes strictly require role: 'admin'
router.use(authenticateToken);
router.use(requireRole(['admin']));

// GET /api/admin/overview
router.get('/overview', (req: Request, res: Response) => {
  try {
    const totalStudents = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'student'`).get() as any;
    const totalParents = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'parent'`).get() as any;
    const totalCalls = db.prepare(`SELECT COUNT(*) as count FROM call_sessions`).get() as any;
    const activeCalls = callService.getActiveCalls();

    res.json({
      success: true,
      stats: {
        totalStudents: totalStudents.count,
        totalParents: totalParents.count,
        totalCalls: totalCalls.count,
        activeCallsCount: activeCalls.length
      },
      activeCalls
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/calls (All call logs)
router.get('/calls', (req: Request, res: Response) => {
  try {
    const history = callService.getCallHistory('', 'admin');
    res.json({ success: true, history });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/schedules
router.get('/schedules', (req: Request, res: Response) => {
  try {
    const schedules = scheduleService.getAllSchedules();
    res.json({ success: true, schedules });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/schedules/:id
router.put('/schedules/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { start_time, end_time, max_duration_minutes, is_active } = req.body;
    scheduleService.updateSchedule(id, { start_time, end_time, max_duration_minutes, is_active });
    res.json({ success: true, message: 'Schedule updated successfully.' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/admin/relationships
router.get('/relationships', (req: Request, res: Response) => {
  try {
    const relationships = db.prepare(`
      SELECT 
        sp.id,
        sp.student_uid as studentUid,
        stu.name as studentName,
        stu.roll_number as studentRoll,
        sp.parent_uid as parentUid,
        par.name as parentName,
        sp.relationship,
        sp.is_authorized as isAuthorized,
        sp.created_at as createdAt
      FROM student_parents sp
      JOIN users stu ON sp.student_uid = stu.uid
      JOIN users par ON sp.parent_uid = par.uid
      ORDER BY stu.name ASC
    `).all();

    res.json({ success: true, relationships });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/relationships
router.post('/relationships', (req: Request, res: Response) => {
  try {
    const { studentUid, parentUid, relationship } = req.body;
    if (!studentUid || !parentUid || !relationship) {
      res.status(400).json({ success: false, message: 'studentUid, parentUid, and relationship are required.' });
      return;
    }

    db.prepare(`
      INSERT INTO student_parents (student_uid, parent_uid, relationship, is_authorized)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(student_uid, parent_uid) DO UPDATE SET
        relationship = excluded.relationship,
        is_authorized = 1
    `).run(studentUid, parentUid, relationship);

    res.json({ success: true, message: 'Relationship linked successfully.' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/relationships/:id/toggle
router.put('/relationships/:id/toggle', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { isAuthorized } = req.body;
    db.prepare(`UPDATE student_parents SET is_authorized = ? WHERE id = ?`).run(isAuthorized ? 1 : 0, id);
    res.json({ success: true, message: 'Authorization status updated.' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/admin/users
router.get('/users', (req: Request, res: Response) => {
  try {
    const users = db.prepare(`
      SELECT uid, name, role, roll_number as rollNumber, avatar_url as avatarUrl, phone, is_online as isOnline, last_seen_at as lastSeenAt
      FROM users
      ORDER BY role ASC, name ASC
    `).all();
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

