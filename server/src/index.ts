import { createApp } from './app';
import { createDefaultConfig } from './config';
import { logError, logInfo } from './logger';

function main(): void {
  const config = createDefaultConfig(process.cwd());
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
