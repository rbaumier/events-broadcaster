const io = require('socket.io')();
const Redis = require('redis');
const url = 'redis://127.0.0.1:6379';
const subscriber = Redis.createClient({ url });
const publisher = Redis.createClient({ url });
const EB = require('events-broadcaster')({ subscriber, publisher });

// receive messages from redis
EB.onMessage((roomId, message) => {
  const { event, payload } = JSON.parse(message);
  // broadcast it to all the connected clients of the room
  io.in(roomId).emit(event, payload);
});

io.on('connection', socket => {
  socket.on('ROOMS_JOIN', (roomId, f) => {
    socket.join(roomId);
    // the maybeSubscribe will listen new messages for this roomId,
    // if we are already listening on it, nothing will be done
    EB.maybeSubscribe(roomId).then(f);
    socket.on('BROADCAST_INSIDE_ROOM', message => {
      EB.publish(
        roomId,
        JSON.stringify({
          event: 'BROADCAST_INSIDE_ROOM',
          payload: message
        })
      );
    });
  });

  socket.on('disconnecting', () => {
    // the maybeUnsubscribe will remove the redis subscription
    // if we don't have other socket clients listening for this room
    Object.keys(socket.rooms).forEach(EB.maybeUnsubscribe);
  });
});

io.listen(3333);
