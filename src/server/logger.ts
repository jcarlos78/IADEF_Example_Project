import pino, { type Logger } from "pino";

const isProd = process.env.NODE_ENV === "production";
const level = process.env.LOG_LEVEL ?? (isProd ? "info" : "debug");

function build(): Logger {
  if (isProd) {
    return pino({ level });
  }
  return pino({
    level,
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
    },
  });
}

export const logger: Logger = build();
