require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// CORS middleware
app.use(cors({
  origin: '*', // In development, allow all. In production, this can be configured.
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Attach Socket.io instance to request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes placeholders/registrations
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/group');
const expenseRoutes = require('./routes/expense');
const settlementRoutes = require('./routes/settlement');

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Splitwise Clone API is running.' });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
    errors: err.errors || null
  });
});

// Socket connection
const handleSocketConnections = require('./socket/chat');
handleSocketConnections(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
