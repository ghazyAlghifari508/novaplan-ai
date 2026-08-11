/**
 * Structured logging via Pino. LOG_LEVEL env controls verbosity (default "info").
 * ponytail: no transports/pretty-printer in prod - Pino logs newline JSON to
 * stdout. Add a `pino-pretty` transport in dev when output becomes hard to read.
 */
import pino from "pino";

export const logger = pino({
	level: process.env.LOG_LEVEL || "info",
	base: { app: "novaplan" },
});
