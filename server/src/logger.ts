type LogFields = Record<string, string | number>;

function write(stream: NodeJS.WriteStream, level: string, message: string, fields: LogFields): void {
  stream.write(`${JSON.stringify({ level, message, ...fields, time: new Date().toISOString() })}\n`);
}

export function logInfo(message: string, fields: LogFields = {}): void {
  write(process.stdout, 'info', message, fields);
}

export function logError(message: string, fields: LogFields = {}): void {
  write(process.stderr, 'error', message, fields);
}
