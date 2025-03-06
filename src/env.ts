import * as v from "valibot";

const envSchema = v.object({
	NODE_ENV: v.optional(v.picklist(["development", "production"]), "development"),
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
