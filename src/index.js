//add room system
//keep last 50 messages
//add settings
//add deadman switch
//modernize ui
//add avatar
//add meta data

require("dotenv").config();

const sqlite3 = require("sqlite3").verbose();
const { v4: uuidv4 } = require("uuid");

const express = require("express");
const app = express();
const server = require("http").createServer(app);
const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log("Server listening at port %d", port);
});

const io = require("socket.io")(server);

const db = new sqlite3.Database("./storage.db");

db.each(
  `CREATE TABLE IF NOT EXISTS rooms (
  room_id TEXT NOT NULL
);`,
  (err) => {
    if (err) console.error(err.message);
  }
);

db.each(
  `CREATE TABLE IF NOT EXISTS messages (
  room_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  user TEXT NOT NULL,
  content TEXT NOT NULL
);`,
  (err) => {
    if (err) console.error(err.message);
  }
);

app.use("/", express.static("dist"));

app.get("/createroom", (req, res) => {
  const id = uuidv4();
  db.get(`INSERT INTO rooms (room_id) VALUES (?)`, [id], (err) => {
    if (err) {
      console.error(err.message);
      res.status(503).send("Server error");
    } else {
      res.status(200).send(id);
    }
  });
});

app.get("/checkroom/:id", (req, res) => {
  const id = req.params.id;
  db.get(`SELECT room_id FROM rooms WHERE room_id = ?`, [id], (err, row) => {
    if (err) {
      console.error(err.message);
      res.status(503).send("Server error");
    } else {
      if (!row) {
        res.status(404).send("Room not found");
      } else {
        res.status(200).send("Room found");
      }
    }
  });
});

let numUsers = 0;

io.on("connection", (socket) => {
  let addedUser = false;

  socket.on("new message", (data) => {
    socket.broadcast.emit("new message", {
      username: socket.username,
      message: data,
    });
  });

  socket.on("add user", (username) => {
    if (addedUser) return;

    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit("login", {
      numUsers: numUsers,
    });
    socket.broadcast.emit("user joined", {
      username: socket.username,
      numUsers: numUsers,
    });
  });

  socket.on("typing", () => {
    socket.broadcast.emit("typing", {
      username: socket.username,
    });
  });

  socket.on("stop typing", () => {
    socket.broadcast.emit("stop typing", {
      username: socket.username,
    });
  });

  socket.on("disconnect", () => {
    if (addedUser) {
      --numUsers;
      socket.broadcast.emit("user left", {
        username: socket.username,
        numUsers: numUsers,
      });
    }
  });
});
