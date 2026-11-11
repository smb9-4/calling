import http from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { app, server } from '../src/index.js';
import { db } from '../src/database.js';

const PORT = 5001; // Test server port
let testServer: http.Server;
let studentToken = '';
let parentToken = '';
let diyaToken = '';
let adminToken = '';

async function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function request(path: string, options: RequestInit = {}) {
  const url = `http://localhost:${PORT}${path}`;
  const res = await fetch(url, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  console.log('\n======================================================');
  console.log(' RUNNING END-TO-END AUTOMATED TEST SUITE');
  console.log(' Testing Stages 1, 2, 7, 8: Auth, Signaling, Rules');
  console.log('======================================================\n');

  // Start test server on port 5001
  await new Promise<void>((resolve) => {
    testServer = server.listen(PORT, () => {
      console.log(`[Test Server] Listening on http://localhost:${PORT}`);
      resolve();
    });
  });

  try {
    // ---------------------------------------------------------
    // STAGE 1: Authentication & UID Verification
    // ---------------------------------------------------------
    console.log('\n--- [STAGE 1] Testing Authentication & UID Verification ---');

    // 1. Student Login via Roll Number
    const stuRes = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '24CSE042', password: 'Password123!' })
    });
    await assert(stuRes.status === 200 && stuRes.data.success, 'Student login using Roll Number 24CSE042');
    await assert(stuRes.data.user.uid === 'STU-1001', 'Student UID is verified as STU-1001');
    studentToken = stuRes.data.token;

    // 2. Student 2 (Diya) Login via UID
    const diyaRes = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'STU-1002', password: 'Password123!' })
    });
    await assert(diyaRes.status === 200, 'Student 2 login using UID STU-1002');
    diyaToken = diyaRes.data.token;

    // 3. Parent Login via UID
    const parRes = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'PAR-2001', password: 'Password123!' })
    });
    await assert(parRes.status === 200 && parRes.data.user.role === 'parent', 'Parent login (PAR-2001)');
    parentToken = parRes.data.token;

    // 4. Admin Login
    const admRes = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'ADM-0001', password: 'AdminPassword123!' })
    });
    await assert(admRes.status === 200 && admRes.data.user.role === 'admin', 'Admin login (ADM-0001)');
    adminToken = admRes.data.token;

    // 5. Invalid credentials test
    const badLogin = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'STU-1001', password: 'WrongPassword!' })
    });
    await assert(badLogin.status === 401 && !badLogin.data.success, 'Reject login with invalid password');

    // 6. Authorized Contacts Check
    const contactsRes = await request('/api/auth/contacts', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    await assert(contactsRes.status === 200, 'Student can retrieve authorized contacts');
    const contacts = contactsRes.data.contacts;
    await assert(contacts.length === 2, 'Student STU-1001 has exactly 2 registered parents');
    await assert(contacts.some((c: any) => c.uid === 'PAR-2001' && c.relationship === 'Father'), 'Contact contains Father (PAR-2001)');
    await assert(contacts.some((c: any) => c.uid === 'PAR-2002' && c.relationship === 'Mother'), 'Contact contains Mother (PAR-2002)');
    await assert(!contacts.some((c: any) => c.uid === 'PAR-2003'), 'Contact does NOT leak unlinked parent PAR-2003');

    // 7. Security: Attempt unauthorized calling of another student's parent
    console.log('\n--- [SECURITY] Testing Cross-Student Parent Calling Prevention ---');
    const unauthCallRes = await request('/api/calls/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}` // Aarav's token
      },
      body: JSON.stringify({ parentUid: 'PAR-2003' }) // Diya's father
    });
    await assert(
      unauthCallRes.status === 400 && unauthCallRes.data.message.includes('Unauthorized call'),
      'Backend strictly blocked student from calling unlinked parent'
    );

    // ---------------------------------------------------------
    // STAGE 7: Calling Schedules & Permissions
    // ---------------------------------------------------------
    console.log('\n--- [STAGE 7] Testing Calling Schedules & Permissions ---');
    const availRes = await request('/api/calls/availability?parentUid=PAR-2001', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    await assert(availRes.status === 200, 'Availability and schedule endpoint succeeds');
    await assert(availRes.data.schedule.isAllowed === true, 'Default schedule allows calling (06:00 - 23:59)');

    // ---------------------------------------------------------
    // STAGE 2: WebRTC Signaling and Socket.IO Connection
    // ---------------------------------------------------------
    console.log('\n--- [STAGE 2] Testing WebRTC Signaling & Socket.IO Events ---');

    // Test rejection of unauthenticated socket
    const rejectPromise = new Promise<boolean>((resolve) => {
      const badSocket = Client(`http://localhost:${PORT}`, {
        reconnection: false,
        timeout: 2000
      });
      badSocket.on('connect_error', (err) => {
        badSocket.close();
        resolve(true);
      });
      badSocket.on('connect', () => {
        badSocket.close();
        resolve(false);
      });
    });
    const socketRejected = await rejectPromise;
    await assert(socketRejected, 'Socket.IO rejects unauthenticated connection');

    // Connect authenticated Student socket
    const studentSocket: ClientSocket = Client(`http://localhost:${PORT}`, {
      auth: { token: studentToken }
    });
    await new Promise<void>((resolve) => studentSocket.on('connect', resolve));
    await assert(studentSocket.connected, 'Student socket connected with JWT authentication');

    // Connect authenticated Parent socket
    const parentSocket: ClientSocket = Client(`http://localhost:${PORT}`, {
      auth: { token: parentToken }
    });
    await new Promise<void>((resolve) => parentSocket.on('connect', resolve));
    await assert(parentSocket.connected, 'Parent socket connected with JWT authentication');

    // Test Call Handshake: Initiate -> Incoming -> Ringing -> Accept -> SDP Offer -> SDP Answer -> ICE -> Connected -> End
    let testCallId = '';

    const callFlowPromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Signaling handshake timed out')), 8000);

      // Parent listens for incoming call
      parentSocket.on('call:incoming', (data: any) => {
        console.log(`[Test] Parent received call:incoming: CallId=${data.callId}, Student=${data.studentName}`);
        testCallId = data.callId;

        // Parent accepts the call
        parentSocket.emit('call:accept', { callId: testCallId });
      });

      // Student receives ringing confirmation
      studentSocket.on('call:ringing', (data: any) => {
        console.log(`[Test] Student received call:ringing for CallId=${data.callId}`);
      });

      // Student receives accept -> sends simulated SDP Offer
      studentSocket.on('call:accepted', (data: any) => {
        console.log(`[Test] Student received call:accepted. Sending simulated WebRTC SDP offer.`);
        studentSocket.emit('call:offer', {
          callId: testCallId,
          sdp: { type: 'offer', sdp: 'v=0\r\no=student 1234 5678 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 50000 RTP/AVP 111\r\n' }
        });
      });

      // Parent receives SDP offer -> sends simulated SDP Answer
      parentSocket.on('call:offer', (data: any) => {
        console.log(`[Test] Parent received WebRTC SDP offer. Sending simulated WebRTC SDP answer.`);
        parentSocket.emit('call:answer', {
          callId: testCallId,
          sdp: { type: 'answer', sdp: 'v=0\r\no=parent 5678 1234 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 50000 RTP/AVP 111\r\n' }
        });
      });

      // Student receives SDP answer
      studentSocket.on('call:answer', (data: any) => {
        console.log(`[Test] Student received WebRTC SDP answer.`);
        // Exchange ICE candidate
        studentSocket.emit('call:ice-candidate', {
          callId: testCallId,
          candidate: { candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 50000 typ host', sdpMid: '0', sdpMLineIndex: 0 }
        });
      });

      // Parent receives ICE candidate
      parentSocket.on('call:ice-candidate', (data: any) => {
        console.log(`[Test] Parent received WebRTC ICE candidate.`);
      });

      // Both receive call:connected
      let studentConnected = false;
      let parentConnected = false;

      studentSocket.on('call:connected', () => {
        studentConnected = true;
        if (studentConnected && parentConnected) onBothConnected();
      });

      parentSocket.on('call:connected', () => {
        parentConnected = true;
        if (studentConnected && parentConnected) onBothConnected();
      });

      function onBothConnected() {
        console.log(`[Test] Both sides connected successfully! Ending call.`);
        // Student ends call
        studentSocket.emit('call:end', { callId: testCallId, reason: 'test_completed' });
      }

      // Both receive call:ended
      parentSocket.on('call:ended', (data: any) => {
        console.log(`[Test] Parent received call:ended. Duration: ${data.durationSeconds}s`);
        clearTimeout(timer);
        resolve();
      });
    });

    // Student initiates call
    studentSocket.emit('call:initiate', { parentUid: 'PAR-2001' });
    await callFlowPromise;
    await assert(true, 'Complete WebRTC signaling handshake (initiate -> accept -> offer -> answer -> ice -> connect -> end)');

    studentSocket.close();
    parentSocket.close();

    // ---------------------------------------------------------
    // STAGE 8: Call History and Administrator Monitoring
    // ---------------------------------------------------------
    console.log('\n--- [STAGE 8] Testing Call History & Admin Monitoring ---');
    const histRes = await request('/api/calls/history', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    await assert(histRes.status === 200 && histRes.data.history.length > 0, 'Student call history records the session');
    const lastCall = histRes.data.history[0];
    await assert(lastCall.id === testCallId, 'Call ID matches the tested session');
    await assert(lastCall.status === 'ended', 'Call session marked as ended in database');

    // Admin overview check
    const adminOverview = await request('/api/admin/overview', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    await assert(adminOverview.status === 200, 'Admin can access system overview');
    await assert(adminOverview.data.stats.totalStudents >= 2, 'Admin overview reports accurate student count');

    console.log('\n======================================================');
    console.log(' ALL AUTOMATED BACKEND TESTS PASSED SUCCESSFULLY! 🚀');
    console.log('======================================================\n');
  } finally {
    testServer.close();
  }
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

