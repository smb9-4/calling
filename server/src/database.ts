import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const webpush = require('web-push');
import { config } from './config.js';
import fs from 'fs';
import path from 'path';

export const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  // Table: users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT CHECK(role IN ('student', 'parent', 'admin')) NOT NULL,
      roll_number TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      phone TEXT,
      is_online INTEGER DEFAULT 0,
      last_seen_at TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_parents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_uid TEXT NOT NULL,
      parent_uid TEXT NOT NULL,
      relationship TEXT NOT NULL, -- 'Father', 'Mother', 'Guardian'
      is_authorized INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_uid) REFERENCES users(uid) ON DELETE CASCADE,
      FOREIGN KEY (parent_uid) REFERENCES users(uid) ON DELETE CASCADE,
      UNIQUE(student_uid, parent_uid)
    );

    CREATE TABLE IF NOT EXISTS call_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week INTEGER NOT NULL, -- 0 (Sunday) to 6 (Saturday)
      start_time TEXT NOT NULL,     -- 'HH:MM' (24-hour, e.g. '17:00')
      end_time TEXT NOT NULL,       -- 'HH:MM' (24-hour, e.g. '22:00')
      max_duration_minutes INTEGER DEFAULT 15,
      is_active INTEGER DEFAULT 1,
      student_uid TEXT,             -- Optional: NULL means applies globally to all students
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS call_sessions (
      id TEXT PRIMARY KEY,          -- UUID
      student_uid TEXT NOT NULL,
      parent_uid TEXT NOT NULL,
      status TEXT CHECK(status IN ('initiated', 'ringing', 'connecting', 'connected', 'rejected', 'missed', 'ended', 'failed')) NOT NULL,
      initiated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      ended_at DATETIME,
      duration_seconds INTEGER DEFAULT 0,
      end_reason TEXT,              -- 'normal', 'rejected_by_parent', 'cancelled_by_student', 'timeout_missed', 'schedule_expired', 'network_failed'
      FOREIGN KEY (student_uid) REFERENCES users(uid),
      FOREIGN KEY (parent_uid) REFERENCES users(uid)
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_uid TEXT NOT NULL,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Ensure VAPID keys exist
  const vapidRow = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('vapid_keys') as { value: string } | undefined;
  if (!vapidRow) {
    const vapidKeys = webpush.generateVAPIDKeys();
    db.prepare('INSERT INTO system_settings (key, value) VALUES (?, ?)').run('vapid_keys', JSON.stringify(vapidKeys));
    config.vapid.publicKey = vapidKeys.publicKey;
    config.vapid.privateKey = vapidKeys.privateKey;
  } else {
    const keys = JSON.parse(vapidRow.value);
    config.vapid.publicKey = keys.publicKey;
    config.vapid.privateKey = keys.privateKey;
  }

  // Seed initial accounts if database is empty
  seedInitialData();
}

function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) return;

  console.log('[Database] Seeding initial users and relationships...');
  const salt = bcrypt.genSaltSync(10);
  const studentPassword = bcrypt.hashSync('Password123!', salt);
  const parentPassword = bcrypt.hashSync('Password123!', salt);
  const adminPassword = bcrypt.hashSync('AdminPassword123!', salt);

  const insertUser = db.prepare(`
    INSERT INTO users (uid, name, role, roll_number, password_hash, avatar_url, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. Students
  insertUser.run(
    'STU-1001',
    'Aarav Sharma',
    'student',
    '24CSE042',
    studentPassword,
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    '+91-9876543210'
  );

  insertUser.run(
    'STU-1002',
    'Diya Patel',
    'student',
    '24CSE089',
    studentPassword,
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    '+91-9876543211'
  );

  // 2. Parents
  insertUser.run(
    'PAR-2001',
    'Rajesh Sharma',
    'parent',
    null,
    parentPassword,
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    '+91-9811122334'
  );

  insertUser.run(
    'PAR-2002',
    'Sunita Sharma',
    'parent',
    null,
    parentPassword,
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    '+91-9811122335'
  );

  insertUser.run(
    'PAR-2003',
    'Vikram Patel',
    'parent',
    null,
    parentPassword,
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    '+91-9822233445'
  );

  // 3. Admin
  insertUser.run(
    'ADM-0001',
    'Dr. K. Rao (Hostel Warden / Administrator)',
    'admin',
    null,
    adminPassword,
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    '+91-9900011223'
  );

  // 4. Student - Parent Relationships
  const insertRelation = db.prepare(`
    INSERT INTO student_parents (student_uid, parent_uid, relationship, is_authorized)
    VALUES (?, ?, ?, 1)
  `);

  // Aarav (STU-1001) linked to Father Rajesh (PAR-2001) and Mother Sunita (PAR-2002)
  insertRelation.run('STU-1001', 'PAR-2001', 'Father');
  insertRelation.run('STU-1001', 'PAR-2002', 'Mother');

  // Diya (STU-1002) linked to Father Vikram (PAR-2003)
  insertRelation.run('STU-1002', 'PAR-2003', 'Father');

  // 5. Calling Schedule (Default: Every day from 06:00 to 23:59 for easy testing, max duration 15 minutes)
  const insertSchedule = db.prepare(`
    INSERT INTO call_schedules (day_of_week, start_time, end_time, max_duration_minutes, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);

  for (let day = 0; day <= 6; day++) {
    insertSchedule.run(day, '06:00', '23:59', 15);
  }

  console.log('[Database] Seeded successfully with test users, authorized relationships, and calling schedules.');
}
