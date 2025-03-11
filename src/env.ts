import * as v from "valibot";

const envSchema = v.object({
	NODE_ENV: v.optional(v.picklist(["development", "production"]), "development"),
	LOG_LEVEL: v.optional(v.picklist(["debug", "info", "warn", "error"]), "info"),
	DISCORD_BOT_TOKEN: v.pipe(v.string(), v.minLength(1)),
	DISCORD_CRYPTO_CHANNEL_ID: v.pipe(v.string(), v.minLength(1)),
	DISCORD_CELEB_CHANNEL_ID: v.pipe(v.string(), v.minLength(1)),
	DISCORD_INFLUENCER_CHANNEL_ID: v.pipe(v.string(), v.minLength(1)),
	DISCORD_POLITICS_CHANNEL_ID: v.pipe(v.string(), v.minLength(1)),
	X_AUTH_BEARER_TOKEN: v.pipe(v.string(), v.minLength(1)),
	// TODO: Add more env vars
});

const validateEnv = (): v.InferOutput<typeof envSchema> => {
	const envResult = v.safeParse(envSchema, process.env);

	if (!envResult.success) {
		const formattedIssues = envResult.issues
			.map((issue) => `- ${issue.path?.map((p) => p.key)}: ${issue.message}`)
			.join("\n");

		throw new Error(`Invalid environment variables:\n${formattedIssues}`);
	}

	return envResult.output;
};

export const validEnv = validateEnv();
