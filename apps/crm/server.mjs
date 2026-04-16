/**
 * Next.js + Socket.IO na jednom porte (Node).
 * Štandardný `next dev` / `next start` Socket.IO nevezme — pre lokálny „živý“ režim
 * použite: npm run dev:ws / npm run start:ws
 */
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || "", true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: true,
      methods: ["GET", "POST"],
    },
    addTrailingSlash: false,
  });

  globalThis.__SOCKET_IO_SERVER = io;

  io.on("connection", (socket) => {
    socket.emit("realtime:hello", {
      socketId: socket.id,
      at: new Date().toISOString(),
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port} (Next + Socket.IO)`);
  });
});
