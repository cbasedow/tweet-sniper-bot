import { Command, type CommandContext, Declare } from "seyfert";
import { MessageFlags } from "seyfert/lib/types";

@Declare({
	name: "ping",
	description: "Ping the bot",
})
export default class PingCommand extends Command {
	public async run(ctx: CommandContext) {
		const ping = ctx.client.gateway.latency;

		await ctx.write({
			content: `Pong! Latency: ${ping}ms`,
			flags: MessageFlags.Ephemeral,
		});
	}
}
