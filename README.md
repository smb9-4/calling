# Private Student-Parent Internet Calling System

A secure, private, internet-based WebRTC voice calling system integrated into a campus student-parent management portal.

---

## 1. System Overview

- **Zero SIM Card Requirement:** Works entirely over Wi-Fi, Ethernet, and mobile data (4G/5G).
- **Zero Telephone Numbers:** Calls are linked exclusively using verified student UIDs and registered parent accounts.
- **Zero Third-Party Apps:** No WhatsApp, Zoom, Twilio Voice SDK, or third-party messengers required.
- **Direct WebRTC Audio:** Peer-to-peer encrypted voice streams (`RTCPeerConnection`) with Opus codec, acoustic echo cancellation, and noise suppression.
- **Hostel Administrator Controlled:** Strict scheduling windows (e.g. 17:00–22:00) and maximum call duration limits enforced on the backend.
- **Privacy & Security:** Conversations are never recorded or stored. Student-parent relationships are strictly enforced on the server; clients cannot spoof caller UIDs.

---

## 2. Default Test Accounts (Pre-Seeded)

| Role | Name | Identifier (UID / Roll) | Password | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Student 1** | Aarav Sharma | `24CSE042` / `STU-1001` | `Password123!` | Linked to Father Rajesh & Mother Sunita |
| **Parent 1** | Rajesh Sharma | `PAR-2001` | `Password123!` | Father of Aarav (`STU-1001`) |
| **Parent 2** | Sunita Sharma | `PAR-2002` | `Password123!` | Mother of Aarav (`STU-1001`) |
| **Student 2** | Diya Patel | `24CSE089` / `STU-1002` | `Password123!` | Linked to Father Vikram (`PAR-2003`) |
| **Parent 3** | Vikram Patel | `PAR-2003` | `Password123!` | Father of Diya (`STU-1002`) |
| **Admin** | Dr. K. Rao | `ADM-0001` | `AdminPassword123!` | Hostel Warden / Administrator |

---

## 3. Technology Stack

- **Backend:** Node.js (v24), Express 5, TypeScript, Better-SQLite3, Socket.IO 4.8, Web-Push, JSON Web Tokens (JWT), Bcrypt.
- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, Lucide Icons, Web Audio API.
- **Signaling & Media:** WebRTC (`RTCPeerConnection`), Google STUN servers (`stun.l.google.com:19302`), configurable TURN server support, Web Audio API stream visualizers.

---

## 4. Architecture & Security Implementation

### A. Strict Backend UID Verification
- The frontend **never** dictates caller identity. Every calling operation extracts `req.user.uid` from the verified JWT bearer token.
- Before initiating or receiving a call, `authService.verifyRelationship(studentUid, parentUid)` checks the `student_parents` database table where `is_authorized = 1`.
- If a student attempts to invoke a call to another student's parent, the backend rejects it with HTTP 400 (`Unauthorized call`).

### B. Calling Schedule & Time Enforcement
- Admin configures permitted days, start time, end time, and maximum call duration in `call_schedules`.
- When `call:initiate` arrives, the backend evaluates current wall-clock time against the schedule.
- When a call connects, the backend starts a watchdog timeout (`setTimeout`) equal to `max_duration_minutes`. If the timer expires, the server automatically ends the call with `call:ended` (`reason: 'max_duration_exceeded'`).

### C. Live Voice Waveform Visualizer
- The in-call screen utilizes the browser's native **Web Audio API** (`AudioContext` and `AnalyserNode`) to measure and display local microphone output and incoming remote audio waveforms. This provides visual confirmation that audio packets are actively streaming.

---

## 5. REST Endpoints & Socket.IO Events

### REST API Endpoints
- `POST /api/auth/login`: Authenticate with Roll No / UID and password.
- `GET /api/auth/me`: Get authenticated user profile.
- `GET /api/auth/contacts`: Get authorized linked parents (if student) or students (if parent).
- `POST /api/calls/initiate`: Initialize call session (student only).
- `POST /api/calls/accept`: Callee answers call.
- `POST /api/calls/reject`: Callee declines call with reason.
- `POST /api/calls/end`: Participant ends call and logs duration.
- `GET /api/calls/history`: Call activity audit logs.
- `GET /api/calls/availability`: Check online status and schedule permissions.
- `GET /api/calls/ice-servers`: Fetch STUN/TURN server credentials.
- `POST /api/calls/push-subscribe`: Register Web Push subscription.
- `GET /api/admin/overview`: System stats and live active call sessions.
- `GET /api/admin/schedules` & `PUT /api/admin/schedules/:id`: Configure schedule rules.
- `GET /api/admin/relationships` & `POST /api/admin/relationships`: Link student-parent accounts.

### Socket.IO Signaling Events
- `call:initiate` / `call:incoming`
- `call:ringing`
- `call:accept` / `call:accepted`
- `call:reject` / `call:rejected`
- `call:offer` (WebRTC SDP Offer)
- `call:answer` (WebRTC SDP Answer)
- `call:ice-candidate` (ICE candidate trickle)
- `call:connected`
- `call:end` / `call:ended`
- `call:missed` (unanswered after 40 seconds)
- `call:failed`
- `presence:update` (online/offline state of linked contacts)

---

## 6. How to Run & Test

### Step 1: Install Dependencies & Run Tests
```powershell
# From project root:
cd server
npm test
```

### Step 2: Start Backend Server
```powershell
cd server
npm run dev
# Server will run on http://localhost:5000 and http://<YOUR_LAN_IP>:5000
```

### Step 3: Start Client Dev Server (or use integrated server build)
```powershell
cd client
npm run dev
# Frontend runs on http://localhost:3000
```

### Step 4: Testing Two-Way Calling Between Student and Parent

1. **Student Terminal (Window 1):**
   - Open `http://localhost:3000` (or incognito window).
   - Click **Student Aarav** (`24CSE042`).
   - You will see the **Parent Connect** card displaying **Rajesh Sharma (Father)** and **Sunita Sharma (Mother)**.

2. **Parent Smartphone (Window 2 or Mobile Device on same Wi-Fi):**
   - Open `http://localhost:3000` (or `http://<YOUR_LAN_IP>:5000` on a smartphone).
   - Click **Father Rajesh** (`PAR-2001`).
   - The status updates to **Available Online**.

3. **Place the Call:**
   - In Window 1 (Student), click **Call Father**.
   - Window 1 shows the calling/ringing overlay and plays a synthesized ringback tone.
   - Window 2 (Parent) immediately rings with visual ripple animation, audio chime, and vibrating alert.
   - Click **Answer** on the parent side.
   - WebRTC SDP offer and answer are exchanged, microphone streams are connected, and live voice visualizers display speaking levels!
   - Test mute/unmute and click **End Call** to verify clean track release and audit history logging.

