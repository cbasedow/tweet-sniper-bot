import { validEnv } from "$/env";
import pino from "pino";

export const logger = pino({
	level: validEnv.LOG_LEVEL,
	serializers: {
		error: pino.stdSerializers.err,
		req: pino.stdSerializers.req,
		res: pino.stdSerializers.res,
	},
	timestamp: pino.stdTimeFunctions.isoTime,
	transport:
		// pino-pretty only in development
		validEnv.NODE_ENV === "development"
			? {
					target: "pino-pretty",
					options: {
						colorize: true,
						ignore: "pid,hostname",
						translateTime: "SYS:HH:MM:ss.l",
					},
				}
			: undefined,
});
