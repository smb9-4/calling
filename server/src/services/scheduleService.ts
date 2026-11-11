import { db } from '../database.js';

export interface ScheduleRule {
  id: number;
  day_of_week: number;
  start_time: string; // 'HH:MM'
  end_time: string;   // 'HH:MM'
  max_duration_minutes: number;
  is_active: number;
  student_uid?: string | null;
}

export interface CallingPermissionResult {
  isAllowed: boolean;
  reason?: string;
  maxDurationMinutes: number;
  schedule?: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    maxDurationMinutes: number;
  };
  nextWindow?: string;
}

export const scheduleService = {
  /**
   * Verifies whether calling is permitted right now for a given student.
   * Enforced strictly on backend.
   */
  checkCallingPermission(studentUid: string): CallingPermissionResult {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    // 1. Look for student-specific active schedule first
    let schedule = db.prepare(`
      SELECT * FROM call_schedules
      WHERE day_of_week = ? AND is_active = 1 AND student_uid = ?
      LIMIT 1
    `).get(dayOfWeek, studentUid) as ScheduleRule | undefined;

    // 2. Fallback to global schedule (student_uid is NULL)
    if (!schedule) {
      schedule = db.prepare(`
        SELECT * FROM call_schedules
        WHERE day_of_week = ? AND is_active = 1 AND student_uid IS NULL
        LIMIT 1
      `).get(dayOfWeek) as ScheduleRule | undefined;
    }

    if (!schedule) {
      return {
        isAllowed: false,
        reason: 'Calling is not scheduled for today by the hostel administration.',
        maxDurationMinutes: 0
      };
    }

    // Check time window
    const isInWindow = currentTimeStr >= schedule.start_time && currentTimeStr <= schedule.end_time;

    if (!isInWindow) {
      return {
        isAllowed: false,
        reason: `Calling hours for today are between ${schedule.start_time} and ${schedule.end_time}. Current time is ${currentTimeStr}.`,
        maxDurationMinutes: schedule.max_duration_minutes,
        schedule: {
          dayOfWeek: schedule.day_of_week,
          startTime: schedule.start_time,
          endTime: schedule.end_time,
          maxDurationMinutes: schedule.max_duration_minutes
        }
      };
    }

    return {
      isAllowed: true,
      maxDurationMinutes: schedule.max_duration_minutes || 15,
      schedule: {
        dayOfWeek: schedule.day_of_week,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        maxDurationMinutes: schedule.max_duration_minutes
      }
    };
  },

  getAllSchedules() {
    return db.prepare(`
      SELECT * FROM call_schedules
      ORDER BY day_of_week ASC, start_time ASC
    `).all();
  },

  updateSchedule(id: number, data: Partial<ScheduleRule>) {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.start_time !== undefined) {
      fields.push('start_time = ?');
      values.push(data.start_time);
    }
    if (data.end_time !== undefined) {
      fields.push('end_time = ?');
      values.push(data.end_time);
    }
    if (data.max_duration_minutes !== undefined) {
      fields.push('max_duration_minutes = ?');
      values.push(data.max_duration_minutes);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(data.is_active ? 1 : 0);
    }

    if (fields.length === 0) return;

    values.push(id);
    db.prepare(`UPDATE call_schedules SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },

  createSchedule(data: {
    day_of_week: number;
    start_time: string;
    end_time: string;
    max_duration_minutes: number;
    student_uid?: string | null;
  }) {
    return db.prepare(`
      INSERT INTO call_schedules (day_of_week, start_time, end_time, max_duration_minutes, student_uid, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(
      data.day_of_week,
      data.start_time,
      data.end_time,
      data.max_duration_minutes,
      data.student_uid || null
    );
  }
};

