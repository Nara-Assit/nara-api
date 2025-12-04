import app from './app.js';
import { createServer, Server as HttpServer } from 'http';
import { config } from './config/config.js';
import { initializeSocket } from './socket.js';

const PORT = config.PORT;
const server: HttpServer = createServer(app);
initializeSocket(server);

server.listen(PORT, () => {
  console.log(`
 Server is running!
 Local: http://localhost:${PORT}
 Environment: ${config.NODE_ENV}
 API Health: http://localhost:${PORT}/api/health
  `);
});
