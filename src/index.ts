import { initBot } from "$/_bot";
import { logger } from "$/utils/logger";

const main = async () => {
	await initBot().match(
		() => logger.info("Bot initialized!"),
		(error) => {
			logger.error({
				msg: "Error initializing bot",
				error,
			});
			process.exit(1);
		},
	);
};

main();

process.on("SIGINT", () => {
	logger.info("SIGINT received, shutting down...");
	process.exit(0);
});

process.on("SIGTERM", () => {
	logger.info("SIGTERM received, shutting down...");
	process.exit(0);
});

process.on("uncaughtException", (error) => {
	logger.fatal({
		msg: "Uncaught exception",
		error,
	});
	process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
	logger.fatal({
		msg: "Unhandled rejection",
		reason,
		promise,
	});
	process.exit(1);
});
