import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

// Config
const PORT = process.env.PORT || 3000;
const MESSAGE_TTL_MS = 30_000; // 30 segundos
const RATE_LIMIT_MS = 400; // ~2.5 msgs/seg por cliente

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' },
});

// Servir frontend
app.use(express.static('public'));

// Memória (apenas para TTL e broadcast de delete)
const timeoutsById = new Map();
const lastSentBySocket = new Map();

io.on('connection', (socket) => {
    // Rate limit simples por socket
    lastSentBySocket.set(socket.id, 0);

    socket.on('send', (payload) => {
        try {
            const now = Date.now();
            const last = lastSentBySocket.get(socket.id) || 0;
            if (now - last < RATE_LIMIT_MS) return;
            lastSentBySocket.set(socket.id, now);

            const text = String(payload?.text ?? '').trim();
            const author = String(payload?.author ?? 'Anônimo').slice(0, 20);
            if (!text) return;

            const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
            const expiresAt = now + MESSAGE_TTL_MS;

            const msg = { id, text, author, expiresAt };

            // Envia a todos
            io.emit('message', msg);

            // Agenda autodestruição
            const t = setTimeout(() => {
                io.emit('delete', { id });
                timeoutsById.delete(id);
            }, MESSAGE_TTL_MS);

            timeoutsById.set(id, t);
        } catch (e) {
            // Silente para não vazar erros
        }
    });

    socket.on('disconnect', () => {
        lastSentBySocket.delete(socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Servidor no ar: http://localhost:${PORT}`);
});
