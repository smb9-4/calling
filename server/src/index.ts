import express from 'express';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config.js';
import { initDatabase } from './database.js';
import { pushService } from './services/pushService.js';
import { setupSignaling } from './sockets/callSignaling.js';
import authRoutes from './routes/authRoutes.js';
import callRoutes from './routes/callRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

// Initialize Database & VAPID
initDatabase();
pushService.init();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Private Student-Parent Calling System'
  });
});

// Serve frontend client build in single-port deployment or network mobile access
const clientDistPath = path.resolve(process.cwd(), '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 30000,
  pingInterval: 10000
});

// Setup signaling logic
setupSignaling(io);

import os from 'os';

function getNetworkIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Start server
server.listen(config.port, '0.0.0.0', () => {
  const lanIp = getNetworkIp();
  console.log(`=======================================================`);
  console.log(` Campus Private Voice Calling Server Running`);
  console.log(` Port: ${config.port}`);
  console.log(` Environment: ${config.nodeEnv}`);
  console.log(` Local URL:   http://localhost:${config.port}`);
  console.log(` Network URL: http://${lanIp}:${config.port}`);
  console.log(`=======================================================`);
});

export { app, server, io };
