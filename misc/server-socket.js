const { verifyToken } = require(".");
const { User, ChatHistory } = require("../models");

function authSocket(socket, next) {
  let token = socket.handshake.auth.token || "";
  verifyToken(token, function (isVerified, tokenData) {
    if (!isVerified) {
      const err = new Error("not authorized");
      err.data = { content: "Your login token expired. Please login again" }; // additional details
      next(err);
    }
    socket.data = { ...socket.data, tokenUser: tokenData };
    next();
  });
}

function initNotifications(io) {
  const nsp = io.of("/notifications");
  nsp.use(authSocket);

  nsp.on("connection", (socket) => {
    const tokenUser = socket.data.tokenUser || null;
    if (!tokenUser) {
      return;
    }
    socket.join(tokenUser.id); //room for user
    console.log("notification:: connected ", tokenUser.id);

    socket.on("notify", (type, notification) => {
      // type = 'Post:Like|Unlike, Comments:Added|Removed|Updated|Like|Unlike, FriendRequest:Sent|Approved|Rejected'
      console.log("Notification all", type, notification);

      socket.emit("received", type, notification);
    });

    socket.on("disconnect", (reason) => {
      console.log(
        "notification::Socket active and reason",
        socket.active,
        reason
      );
    });
    socket.on("error", (err) => {
      console.log("notification::Make socket disconnected if not auth", err);
      if (err && err.message === "not authorized") {
        socket.disconnect();
      }
    });
  });
  return nsp;
}
function initChat(io) {
  const nsp = io.of("/chats");
  nsp.use(authSocket);
  nsp.on("connection", (socket) => {
    const tokenUser = socket.data.tokenUser || null;
    const roomId = socket.handshake.auth.roomId || null;
    console.log("handshake auth data", socket.handshake);
    if (!tokenUser) {
      console.log("Invalid auth token");
      return;
    }
    if (!roomId) {
      console.log("Invalid/Missing Room Id");
      return;
    }
    socket.join(roomId);
    console.log("chat:: connected", roomId);

    socket.on("onmessage", async (roomId, msg) => {
      console.log("message: " + msg, io.sockets.adapter.rooms);
      const user = await User.findById(msg.userId);
      socket.to(roomId).emit("onmessage", { ...msg, user });
      // store the message
      ChatHistory.create({
        sessionId: msg.sessionId,
        message: msg.message,
        user: user._id,
      })
        .then(() => {
          // console.log("Chat message saved");
        })
        .catch((err) => console.log("Error saving chat", err));
    });

    socket.on("disconnect", (reason) => {
      console.log("chat::Socket active and reason", socket.active, reason);
    });
    socket.on("error", (err) => {
      console.log("chat::Make socket disconnected if not auth", err);
      if (err && err.message === "not authorized") {
        socket.disconnect();
      }
    });
  });
  return nsp;
}

function initSockets(io) {
  const notifyNSP = initNotifications(io);
  const chatNSP = initChat(io);
  return { notifyNSP, chatNSP };
}

module.exports = { initSockets };

/**
 * io.use((socket, next) => {
  let token = socket.handshake.auth.token || "";
  verifyToken(token, function (isVerified, tokenData) {
    if (!isVerified) {
      const err = new Error("not authorized");
      err.data = { content: "Please retry later" }; // additional details
      next(err);
    }
    socket.data = { tokenUser: tokenData };
    next();
  });
});


io.on("connection", (socket) => {
  console.log("Socket data after middleware", socket.id);
  const tokenUser = socket.data.tokenUser || null;
  if (tokenUser) {
    // const user = User.findById(tokenUser.id);
    // user.sockets.push(socket.id);
    // user.save();
  }

  socket.on("start", async (roomId) => {
    socket.join(roomId);
    // await ChatSession.findOneAndUpdate(
    //   { roomId: roomId },
    //   { status: "online" }
    // );
    // socket.to(roomId).emit("joinedRoom", "Hello Connected Users");
  });
  socket.on("onmessage", async (roomId, msg) => {
    console.log("message: " + msg, io.sockets.adapter.rooms);
    const user = await User.findById(msg.userId);
    socket.to(roomId).emit("onmessage", { ...msg, user });
  });
  socket.on("stop", (roomId) => {
    socket.leave(roomId);
    // socket.to(roomId).emit("joinedRoom", "Hello Connected Users");
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket active and reason", socket.active, reason);
  });

  socket.on("error", (err) => {
    console.log("Make socket discoonected if not auth", err);
    if (err && err.message === "not authorized") {
      socket.disconnect();
    }
  });
});

 */
