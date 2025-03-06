import { logger } from "$/utils/logger";
import { createEvent } from "seyfert";

export default createEvent({
	data: {
		once: true,
		name: "botReady",
	},
	run(user) {
		logger.info(`Bot is ready as @${user.username}!`);
	},
});
