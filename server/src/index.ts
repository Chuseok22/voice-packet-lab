import { createApp } from './app';
import { loadConfig, type ServerConfig } from './config';
import { logError, logInfo } from './logger';

function main(): void {
  let config: ServerConfig;
  try {
    config = loadConfig(process.env, process.cwd());
  } catch (error) {
    logError('invalid configuration', { reason: error instanceof Error ? error.message : 'unknown' });
    process.exit(1);
  }

  const app = createApp(config);
  app.server.listen(config.port, () => {
    logInfo('server listening', { port: config.port, staticDir: config.staticDir });
  });

  app.server.on('error', (error: NodeJS.ErrnoException) => {
    logError('server failed', { code: error.code ?? 'unknown' });
    process.exit(1);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logInfo('shutting down', { signal });
    app.close().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
