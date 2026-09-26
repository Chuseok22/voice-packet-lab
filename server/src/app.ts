import { createServer, type Server } from 'node:http';
import { attachGateway } from './gatewayServer';
import { createHttpHandler } from './httpHandler';
import type { ServerConfig } from './config';

export interface AppHandle {
  server: Server;
  close(): Promise<void>;
}

export function createApp(config: ServerConfig): AppHandle {
  const server = createServer(createHttpHandler(config.staticDir));
  const gateway = attachGateway(server, {
    allowedOrigins: config.allowedOrigins,
    maxConnections: config.maxConnections,
  });

  return {
    server,
    close: async () => {
      await gateway.close();
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}
