import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AuthenticatedUser } from '../middleware/authMiddleware.js';
import { authService } from '../services/authService.js';
import { callService } from '../services/callService.js';
import { scheduleService } from '../services/scheduleService.js';
import { pushService } from '../services/pushService.js';
import { db } from '../database.js';

interface AuthenticatedSocket extends Socket {
  user?: AuthenticatedUser;
}

// Map of UID -> Set of active socket IDs
const userSockets = new Map<string, Set<string>>();

// Map of callId -> { timeoutId?: NodeJS.Timeout, maxDurationTimeoutId?: NodeJS.Timeout }
const activeCallTimers = new Map<string, { ringTimeoutId?: NodeJS.Timeout; durationTimeoutId?: NodeJS.Timeout }>();

export function setupSignaling(io: SocketIOServer) {
  // Authentication middleware for Socket.IO
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token as string | undefined;

    if (!token) {
      return next(new Error('Authentication required: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as AuthenticatedUser;
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication failed: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    const uid = user.uid;

    console.log(`[Socket] User connected: ${user.name} (${uid}), Role: ${user.role}, Socket: ${socket.id}`);

    // Track socket mapping
    if (!userSockets.has(uid)) {
      userSockets.set(uid, new Set());
    }
    userSockets.get(uid)!.add(socket.id);

    // Join room for user's own UID for multi-device / multi-tab routing
    socket.join(`user:${uid}`);

    // Update online presence in DB
    authService.updateOnlineStatus(uid, true);

    // Broadcast presence update to linked contacts
    broadcastPresence(io, user, true);

    // 1. Initiate Call (Student -> Parent)
    socket.on('call:initiate', async (data: { parentUid: string }) => {
      try {
        const { parentUid } = data;
        if (user.role !== 'student') {
          socket.emit('call:error', { message: 'Only students can initiate parent calls.' });
          return;
        }

        if (!parentUid) {
          socket.emit('call:error', { message: 'Parent UID is required.' });
          return;
        }

        // Verify calling schedule strictly
        const scheduleCheck = scheduleService.checkCallingPermission(uid);
        if (!scheduleCheck.isAllowed) {
          socket.emit('call:rejected', {
            reason: scheduleCheck.reason || 'Calling is currently outside permitted hours.'
          });
          return;
        }

        // Verify authorized relationship strictly
        const isLinked = authService.verifyRelationship(uid, parentUid);
        if (!isLinked) {
          socket.emit('call:error', { message: 'Unauthorized: This parent is not linked to your student account.' });
          return;
        }

        // Create call session in DB
        const sessionResult = callService.initiateCall(uid, parentUid);
        const callId = sessionResult.callId;

        // Fetch student profile info for caller display
        const studentInfo = db.prepare(`SELECT name, roll_number, avatar_url FROM users WHERE uid = ?`).get(uid) as any;

        // Check if parent has connected socket
        const parentSocketSet = userSockets.get(parentUid);
        const isParentConnected = parentSocketSet && parentSocketSet.size > 0;

        console.log(`[Call] Initiating call ${callId} from ${user.name} (${uid}) to Parent ${parentUid} (Connected: ${isParentConnected})`);

        // Send ringing status to caller
        socket.emit('call:ringing', {
          callId,
          parentUid,
          parentName: sessionResult.parentName,
          parentAvatar: sessionResult.parentAvatar,
          maxDurationMinutes: sessionResult.maxDurationMinutes,
          iceServers: sessionResult.iceServers
        });

        // Notify parent sockets
        io.to(`user:${parentUid}`).emit('call:incoming', {
          callId,
          studentUid: uid,
          studentName: studentInfo?.name || user.name,
          studentRoll: studentInfo?.roll_number || user.rollNumber,
          studentAvatar: studentInfo?.avatar_url,
          initiatedAt: new Date().toISOString(),
          iceServers: sessionResult.iceServers
        });

        // Trigger Web Push Notification in case parent's tab is minimized or in background
        pushService.sendCallNotification(
          parentUid,
          studentInfo?.name || user.name,
          studentInfo?.roll_number || '',
          callId
        ).catch(e => console.error('[Push] Error sending push:', e.message));

        // Start ringing timeout: 40 seconds before auto-missed
        const ringTimeoutId = setTimeout(() => {
          const session = callService.getCallSession(callId);
          if (session && (session.status === 'initiated' || session.status === 'ringing')) {
            console.log(`[Call] Call ${callId} timed out with no answer (Missed).`);
            callService.markMissed(callId);

            io.to(`user:${uid}`).emit('call:missed', { callId, reason: 'Parent did not answer within time.' });
            io.to(`user:${parentUid}`).emit('call:missed', { callId, reason: 'Missed call from student.' });
            activeCallTimers.delete(callId);
          }
        }, 40000);

        activeCallTimers.set(callId, { ringTimeoutId });
      } catch (err: any) {
        socket.emit('call:error', { message: err.message || 'Failed to initiate call.' });
      }
    });

    // 2. Accept Call (Parent -> Student)
    socket.on('call:accept', (data: { callId: string }) => {
      try {
        const { callId } = data;
        const session = callService.getCallSession(callId);
        if (!session) {
          socket.emit('call:error', { message: 'Call session not found.' });
          return;
        }

        if (session.parent_uid !== uid) {
          socket.emit('call:error', { message: 'Unauthorized call accept.' });
          return;
        }

        // Clear ring timeout
        const timers = activeCallTimers.get(callId);
        if (timers?.ringTimeoutId) {
          clearTimeout(timers.ringTimeoutId);
        }

        callService.acceptCall(callId, uid);

        console.log(`[Call] Call ${callId} accepted by Parent ${uid}`);

        // Notify student that call was accepted and to prepare WebRTC offer
        io.to(`user:${session.student_uid}`).emit('call:accepted', { callId, parentUid: uid });
        socket.emit('call:connecting', { callId });
      } catch (err: any) {
        socket.emit('call:error', { message: err.message });
      }
    });

    // 3. Reject Call (Parent -> Student)
    socket.on('call:reject', (data: { callId: string; reason?: string }) => {
      try {
        const { callId, reason } = data;
        const session = callService.getCallSession(callId);
        if (!session) return;

        if (session.parent_uid !== uid) {
          socket.emit('call:error', { message: 'Unauthorized.' });
          return;
        }

        // Clear ring timeout
        const timers = activeCallTimers.get(callId);
        if (timers?.ringTimeoutId) clearTimeout(timers.ringTimeoutId);
        activeCallTimers.delete(callId);

        callService.rejectCall(callId, uid, reason || 'declined_by_parent');

        console.log(`[Call] Call ${callId} rejected by Parent ${uid}`);

        io.to(`user:${session.student_uid}`).emit('call:rejected', {
          callId,
          reason: reason || 'Call was declined by parent.'
        });
      } catch (err: any) {
        socket.emit('call:error', { message: err.message });
      }
    });

    // 4. WebRTC SDP Offer (Student -> Parent)
    socket.on('call:offer', (data: { callId: string; sdp: RTCSessionDescriptionInit }) => {
      try {
        const { callId, sdp } = data;
        const session = callService.getCallSession(callId);
        if (!session) return;

        // Verify participant
        if (session.student_uid !== uid && session.parent_uid !== uid) {
          socket.emit('call:error', { message: 'Unauthorized signaling.' });
          return;
        }

        const targetUid = session.student_uid === uid ? session.parent_uid : session.student_uid;
        console.log(`[WebRTC] Forwarding SDP offer for call ${callId} to ${targetUid}`);

        io.to(`user:${targetUid}`).emit('call:offer', { callId, sdp });
      } catch (err: any) {
        socket.emit('call:error', { message: err.message });
      }
    });

    // 5. WebRTC SDP Answer (Parent -> Student)
    socket.on('call:answer', (data: { callId: string; sdp: RTCSessionDescriptionInit }) => {
      try {
        const { callId, sdp } = data;
        const session = callService.getCallSession(callId);
        if (!session) return;

        if (session.student_uid !== uid && session.parent_uid !== uid) {
          socket.emit('call:error', { message: 'Unauthorized signaling.' });
          return;
        }

        const targetUid = session.student_uid === uid ? session.parent_uid : session.student_uid;
        console.log(`[WebRTC] Forwarding SDP answer for call ${callId} to ${targetUid}`);

        io.to(`user:${targetUid}`).emit('call:answer', { callId, sdp });

        // Call is now connected!
        callService.markConnected(callId);

        // Schedule max duration watchdog timer (Stage 7)
        const permission = scheduleService.checkCallingPermission(session.student_uid);
        const maxMinutes = permission.maxDurationMinutes || 15;
        const maxDurationMs = maxMinutes * 60 * 1000;

        console.log(`[Call] Max duration enforcement for ${callId}: ${maxMinutes} minutes.`);

        const durationTimeoutId = setTimeout(() => {
          console.log(`[Call] Maximum call duration (${maxMinutes}m) reached for call ${callId}. Terminating.`);
          const endResult = callService.endCall(callId, session.student_uid, 'max_duration_exceeded');
          io.to(`user:${session.student_uid}`).emit('call:ended', {
            callId,
            reason: 'Maximum permitted call duration reached.',
            durationSeconds: endResult.durationSeconds
          });
          io.to(`user:${session.parent_uid}`).emit('call:ended', {
            callId,
            reason: 'Maximum permitted call duration reached.',
            durationSeconds: endResult.durationSeconds
          });
          activeCallTimers.delete(callId);
        }, maxDurationMs);

        const currentTimers = activeCallTimers.get(callId) || {};
        activeCallTimers.set(callId, { ...currentTimers, durationTimeoutId });

        io.to(`user:${session.student_uid}`).emit('call:connected', { callId });
        io.to(`user:${session.parent_uid}`).emit('call:connected', { callId });
      } catch (err: any) {
        socket.emit('call:error', { message: err.message });
      }
    });

    // 6. WebRTC ICE Candidate (Peer-to-Peer trickle)
    socket.on('call:ice-candidate', (data: { callId: string; candidate: RTCIceCandidateInit }) => {
      try {
        const { callId, candidate } = data;
        const session = callService.getCallSession(callId);
        if (!session) return;

        if (session.student_uid !== uid && session.parent_uid !== uid) return;

        const targetUid = session.student_uid === uid ? session.parent_uid : session.student_uid;
        io.to(`user:${targetUid}`).emit('call:ice-candidate', { callId, candidate });
      } catch (err: any) {
        console.error('[WebRTC] ICE candidate error:', err.message);
      }
    });

    // 7. End Call (Caller or Callee)
    socket.on('call:end', (data: { callId: string; reason?: string }) => {
      try {
        const { callId, reason } = data;
        const session = callService.getCallSession(callId);
        if (!session) return;

        // Clear timers
        const timers = activeCallTimers.get(callId);
        if (timers?.ringTimeoutId) clearTimeout(timers.ringTimeoutId);
        if (timers?.durationTimeoutId) clearTimeout(timers.durationTimeoutId);
        activeCallTimers.delete(callId);

        const endResult = callService.endCall(callId, uid, reason || 'normal');

        console.log(`[Call] Call ${callId} ended by ${uid}. Duration: ${endResult.durationSeconds}s`);

        io.to(`user:${session.student_uid}`).emit('call:ended', {
          callId,
          reason: reason || 'Call ended.',
          durationSeconds: endResult.durationSeconds
        });
        io.to(`user:${session.parent_uid}`).emit('call:ended', {
          callId,
          reason: reason || 'Call ended.',
          durationSeconds: endResult.durationSeconds
        });
      } catch (err: any) {
        socket.emit('call:error', { message: err.message });
      }
    });

    // Disconnect handling
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${user.name} (${uid}), Socket: ${socket.id}`);
      const sockets = userSockets.get(uid);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(uid);
          authService.updateOnlineStatus(uid, false);
          broadcastPresence(io, user, false);
        }
      }
    });
  });
}

function broadcastPresence(io: SocketIOServer, user: AuthenticatedUser, isOnline: boolean) {
  try {
    const contacts = authService.getAuthorizedContacts(user);
    contacts.forEach(contact => {
      io.to(`user:${contact.uid}`).emit('presence:update', {
        uid: user.uid,
        name: user.name,
        isOnline
      });
    });
  } catch (err: any) {
    console.error('[Presence] Error broadcasting presence:', err.message);
  }
}

