const prisma = require('../config/database');

const handleSocketConnections = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a group chat room
    socket.on('joinGroup', ({ groupId, userId }) => {
      if (!groupId) return;
      
      const roomName = `group_${groupId}`;
      socket.join(roomName);
      console.log(`User ${userId} joined room: ${roomName}`);
    });

    // Handle incoming messages
    socket.on('sendMessage', async ({ groupId, senderId, content }) => {
      if (!groupId || !senderId || !content || content.trim() === '') return;

      try {
        // Persist message to database
        const savedMessage = await prisma.message.create({
          data: {
            groupId,
            senderId,
            content,
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        });

        // Broadcast message to everyone in the room
        const roomName = `group_${groupId}`;
        io.to(roomName).emit('messageReceived', savedMessage);
      } catch (error) {
        console.error('Socket Message Error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = handleSocketConnections;
