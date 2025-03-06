import { validEnv } from "$/env";
import { config } from "seyfert";

export default config.bot({
	token: validEnv.DISCORD_BOT_TOKEN,
	locations: {
		base: "src/_bot",
		commands: "commands",
		events: "events",
	},
	intents: ["Guilds", "GuildMessages", "GuildMembers"],
});
