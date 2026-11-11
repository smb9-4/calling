import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database.js';
import { config } from '../config.js';
import { AuthenticatedUser } from '../middleware/authMiddleware.js';

export interface UserRecord {
  id: number;
  uid: string;
  name: string;
  role: 'student' | 'parent' | 'admin';
  roll_number: string | null;
  password_hash: string;
  avatar_url: string | null;
  phone: string | null;
  is_online: number;
  last_seen_at: string | null;
}

export interface ContactInfo {
  uid: string;
  name: string;
  role: string;
  relationship?: string;
  rollNumber?: string | null;
  avatarUrl?: string | null;
  isOnline: boolean;
  phone?: string | null;
}

export const authService = {
  login(identifier: string, passwordPlain: string) {
    if (!identifier || !passwordPlain) {
      throw new Error('Identifier and password are required');
    }

    // Lookup user by UID or roll_number
    const user = db.prepare(`
      SELECT * FROM users 
      WHERE uid = ? OR roll_number = ?
    `).get(identifier.trim(), identifier.trim()) as UserRecord | undefined;

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = bcrypt.compareSync(passwordPlain, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const payload: AuthenticatedUser = {
      uid: user.uid,
      name: user.name,
      role: user.role,
      rollNumber: user.roll_number
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

    return {
      token,
      user: {
        uid: user.uid,
        name: user.name,
        role: user.role,
        rollNumber: user.roll_number,
        avatarUrl: user.avatar_url,
        phone: user.phone
      }
    };
  },

  getProfile(uid: string) {
    const user = db.prepare(`
      SELECT uid, name, role, roll_number as rollNumber, avatar_url as avatarUrl, phone, is_online as isOnline
      FROM users WHERE uid = ?
    `).get(uid);

    return user;
  },

  /**
   * Retrieves strictly authorized contacts:
   * - If student: returns linked registered parents only
   * - If parent: returns linked registered students only
   * - If admin: returns empty or admin view
   */
  getAuthorizedContacts(user: AuthenticatedUser): ContactInfo[] {
    if (user.role === 'student') {
      const rows = db.prepare(`
        SELECT u.uid, u.name, u.role, sp.relationship, u.avatar_url as avatarUrl, u.is_online as isOnline, u.phone
        FROM student_parents sp
        JOIN users u ON sp.parent_uid = u.uid
        WHERE sp.student_uid = ? AND sp.is_authorized = 1
      `).all(user.uid) as any[];

      return rows.map(r => ({
        uid: r.uid,
        name: r.name,
        role: r.role,
        relationship: r.relationship,
        avatarUrl: r.avatarUrl,
        isOnline: Boolean(r.isOnline),
        phone: r.phone
      }));
    } else if (user.role === 'parent') {
      const rows = db.prepare(`
        SELECT u.uid, u.name, u.role, u.roll_number as rollNumber, sp.relationship, u.avatar_url as avatarUrl, u.is_online as isOnline
        FROM student_parents sp
        JOIN users u ON sp.student_uid = u.uid
        WHERE sp.parent_uid = ? AND sp.is_authorized = 1
      `).all(user.uid) as any[];

      return rows.map(r => ({
        uid: r.uid,
        name: r.name,
        role: r.role,
        relationship: r.relationship,
        rollNumber: r.rollNumber,
        avatarUrl: r.avatarUrl,
        isOnline: Boolean(r.isOnline)
      }));
    }

    return [];
  },

  /**
   * Strictly verify if a given student UID is linked and authorized to call a parent UID.
   * This is enforced entirely on the backend to prevent spoofing or unauthorized calls.
   */
  verifyRelationship(studentUid: string, parentUid: string): boolean {
    const relation = db.prepare(`
      SELECT id FROM student_parents
      WHERE student_uid = ? AND parent_uid = ? AND is_authorized = 1
    `).get(studentUid, parentUid);

    return Boolean(relation);
  },

  updateOnlineStatus(uid: string, isOnline: boolean) {
    db.prepare(`
      UPDATE users 
      SET is_online = ?, last_seen_at = CURRENT_TIMESTAMP
      WHERE uid = ?
    `).run(isOnline ? 1 : 0, uid);
  }
};

