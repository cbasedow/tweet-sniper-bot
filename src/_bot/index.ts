import { formatUnknownError } from "$/utils/format-unknown-error";
import { ResultAsync } from "neverthrow";
import { Client, type ParseClient } from "seyfert";
import { ActivityType, PresenceUpdateStatus } from "seyfert/lib/types";

declare module "seyfert" {
	// Extend seyfert Client type with Gateway
	interface UsingClient extends ParseClient<Client<true>> {}
}

const client = new Client({
	presence: () => ({
		status: PresenceUpdateStatus.Online,
		activities: [
			{
				name: "Tweets",
				type: ActivityType.Watching,
			},
		],
		since: Date.now(),
		afk: false,
	}),
});

export const initBot = (): ResultAsync<void, Error> => {
	return ResultAsync.fromPromise(
		client.start().then(async () => await client.uploadCommands({ cachePath: "./src/_bot/commands.json" })),
		(error) => formatUnknownError(error, "Failed to start Discord bot"),
	);
};
