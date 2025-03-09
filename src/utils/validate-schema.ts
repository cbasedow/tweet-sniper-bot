import { type Result, err, ok } from "neverthrow";
import * as v from "valibot";

export const validateSchema = <TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
	schema: TSchema,
	data: unknown,
): Result<v.InferOutput<TSchema>, Error> => {
	const result = v.safeParse(schema, data);

	if (!result.success) {
		const formattedIssues = result.issues
			.map((issue) => `${issue.path?.map((p) => p.toString()).join(".")}: ${issue.message}`)
			.join("\n");
		return err(new Error(`Invalid data: ${formattedIssues}`));
	}

	return ok(result.output);
};
