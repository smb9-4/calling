import { v4 as uuidv4 } from 'uuid';
import { db } from '../database.js';
import { authService } from './authService.js';
import { scheduleService } from './scheduleService.js';
import { config } from '../config.js';

export interface CallSession {
  id: string;
  student_uid: string;
  parent_uid: string;
  status: 'initiated' | 'ringing' | 'connecting' | 'connected' | 'rejected' | 'missed' | 'ended' | 'failed';
  initiated_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  end_reason: string | null;
  studentName?: string;
  studentRoll?: string;
  studentAvatar?: string;
  parentName?: string;
  relationship?: string;
}

export const callService = {
  /**
   * Validates and initiates a new call session.
   * Enforces:
   * 1. Student identity from token
   * 2. Active calling schedule window
   * 3. Registered parent-student relationship
   * 4. No simultaneous active calls for the same student
   */
  initiateCall(studentUid: string, parentUid: string) {
    // 1. Verify calling schedule permission
    const scheduleCheck = scheduleService.checkCallingPermission(studentUid);
    if (!scheduleCheck.isAllowed) {
      throw new Error(scheduleCheck.reason || 'Calling is currently outside the permitted schedule.');
    }

    // 2. Verify student-parent registered relationship
    const isLinked = authService.verifyRelationship(studentUid, parentUid);
    if (!isLinked) {
      throw new Error('Unauthorized call: This parent is not registered or linked to your student account.');
    }

    // 3. Check for any existing active/in-progress call for this student or parent
    const activeCall = db.prepare(`
      SELECT id FROM call_sessions
      WHERE (student_uid = ? OR parent_uid = ?)
      AND status IN ('initiated', 'ringing', 'connecting', 'connected')
      LIMIT 1
    `).get(studentUid, parentUid) as { id: string } | undefined;

    if (activeCall) {
      // Auto-cleanup stale calls older than 5 minutes if any
      db.prepare(`
        UPDATE call_sessions
        SET status = 'ended', ended_at = CURRENT_TIMESTAMP, end_reason = 'stale_session_cleanup'
        WHERE id = ? AND (strftime('%s', 'now') - strftime('%s', initiated_at)) > 300
      `).run(activeCall.id);
    }

    const callId = uuidv4();
    db.prepare(`
      INSERT INTO call_sessions (id, student_uid, parent_uid, status, initiated_at)
      VALUES (?, ?, ?, 'initiated', CURRENT_TIMESTAMP)
    `).run(callId, studentUid, parentUid);

    // Fetch parent info
    const parent = db.prepare(`
      SELECT uid, name, avatar_url as avatarUrl, is_online as isOnline
      FROM users WHERE uid = ?
    `).get(parentUid) as any;

    return {
      callId,
      studentUid,
      parentUid,
      parentName: parent?.name,
      parentAvatar: parent?.avatarUrl,
      isParentOnline: Boolean(parent?.isOnline),
      maxDurationMinutes: scheduleCheck.maxDurationMinutes,
      iceServers: config.iceServers
    };
  },

  acceptCall(callId: string, parentUid: string) {
    const session = db.prepare(`SELECT * FROM call_sessions WHERE id = ?`).get(callId) as CallSession | undefined;
    if (!session) {
      throw new Error('Call session not found.');
    }

    if (session.parent_uid !== parentUid) {
      throw new Error('Unauthorized: You are not the recipient of this call.');
    }

    if (session.status !== 'initiated' && session.status !== 'ringing') {
      throw new Error(`Call cannot be accepted in state: ${session.status}`);
    }

    db.prepare(`
      UPDATE call_sessions
      SET status = 'connecting', started_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(callId);

    return { callId, status: 'connecting', studentUid: session.student_uid };
  },

  markConnected(callId: string) {
    db.prepare(`
      UPDATE call_sessions
      SET status = 'connected', started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
      WHERE id = ?
    `).run(callId);
  },

  rejectCall(callId: string, parentUid: string, reason: string = 'declined_by_parent') {
    const session = db.prepare(`SELECT * FROM call_sessions WHERE id = ?`).get(callId) as CallSession | undefined;
    if (!session) {
      throw new Error('Call session not found.');
    }

    if (session.parent_uid !== parentUid) {
      throw new Error('Unauthorized.');
    }

    db.prepare(`
      UPDATE call_sessions
      SET status = 'rejected', ended_at = CURRENT_TIMESTAMP, end_reason = ?
      WHERE id = ?
    `).run(reason, callId);

    return { callId, studentUid: session.student_uid, reason };
  },

  endCall(callId: string, userUid: string, reason: string = 'normal') {
    const session = db.prepare(`SELECT * FROM call_sessions WHERE id = ?`).get(callId) as CallSession | undefined;
    if (!session) {
      throw new Error('Call session not found.');
    }

    if (session.student_uid !== userUid && session.parent_uid !== userUid) {
      throw new Error('Unauthorized: You are not a participant in this call.');
    }

    // Calculate call duration
    let durationSeconds = 0;
    if (session.started_at) {
      const utcString = session.started_at.endsWith('Z') ? session.started_at : session.started_at.replace(' ', 'T') + 'Z';
      const startMs = new Date(utcString).getTime();
      const endMs = Date.now();
      durationSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
    }

    db.prepare(`
      UPDATE call_sessions
      SET status = 'ended', ended_at = CURRENT_TIMESTAMP, duration_seconds = ?, end_reason = ?
      WHERE id = ?
    `).run(durationSeconds, reason, callId);

    return {
      callId,
      studentUid: session.student_uid,
      parentUid: session.parent_uid,
      durationSeconds,
      reason
    };
  },

  markMissed(callId: string) {
    db.prepare(`
      UPDATE call_sessions
      SET status = 'missed', ended_at = CURRENT_TIMESTAMP, end_reason = 'timeout_missed'
      WHERE id = ? AND status IN ('initiated', 'ringing')
    `).run(callId);
  },

  markFailed(callId: string, reason: string) {
    db.prepare(`
      UPDATE call_sessions
      SET status = 'failed', ended_at = CURRENT_TIMESTAMP, end_reason = ?
      WHERE id = ?
    `).run(reason, callId);
  },

  getCallSession(callId: string): CallSession | undefined {
    return db.prepare(`SELECT * FROM call_sessions WHERE id = ?`).get(callId) as CallSession | undefined;
  },

  /**
   * Retrieves call history for student, parent, or admin
   */
  getCallHistory(userUid: string, role: string) {
    if (role === 'admin') {
      return db.prepare(`
        SELECT 
          cs.*,
          stu.name as studentName,
          stu.roll_number as studentRoll,
          stu.avatar_url as studentAvatar,
          par.name as parentName,
          sp.relationship
        FROM call_sessions cs
        JOIN users stu ON cs.student_uid = stu.uid
        JOIN users par ON cs.parent_uid = par.uid
        LEFT JOIN student_parents sp ON sp.student_uid = cs.student_uid AND sp.parent_uid = cs.parent_uid
        ORDER BY cs.initiated_at DESC
        LIMIT 100
      `).all();
    } else if (role === 'student') {
      return db.prepare(`
        SELECT 
          cs.*,
          par.name as parentName,
          par.avatar_url as parentAvatar,
          sp.relationship
        FROM call_sessions cs
        JOIN users par ON cs.parent_uid = par.uid
        LEFT JOIN student_parents sp ON sp.student_uid = cs.student_uid AND sp.parent_uid = cs.parent_uid
        WHERE cs.student_uid = ?
        ORDER BY cs.initiated_at DESC
        LIMIT 50
      `).all(userUid);
    } else if (role === 'parent') {
      return db.prepare(`
        SELECT 
          cs.*,
          stu.name as studentName,
          stu.roll_number as studentRoll,
          stu.avatar_url as studentAvatar,
          sp.relationship
        FROM call_sessions cs
        JOIN users stu ON cs.student_uid = stu.uid
        LEFT JOIN student_parents sp ON sp.student_uid = cs.student_uid AND sp.parent_uid = cs.parent_uid
        WHERE cs.parent_uid = ?
        ORDER BY cs.initiated_at DESC
        LIMIT 50
      `).all(userUid);
    }

    return [];
  },

  getActiveCalls() {
    return db.prepare(`
      SELECT 
        cs.*,
        stu.name as studentName,
        stu.roll_number as studentRoll,
        par.name as parentName,
        sp.relationship
      FROM call_sessions cs
      JOIN users stu ON cs.student_uid = stu.uid
      JOIN users par ON cs.parent_uid = par.uid
      LEFT JOIN student_parents sp ON sp.student_uid = cs.student_uid AND sp.parent_uid = cs.parent_uid
      WHERE cs.status IN ('initiated', 'ringing', 'connecting', 'connected')
      ORDER BY cs.initiated_at DESC
    `).all();
  }
};
