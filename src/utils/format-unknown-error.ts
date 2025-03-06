import { fromThrowable } from "neverthrow";

export const formatUnknownError = (error: unknown, context?: string): Error => {
	if (error instanceof Error) {
		return context ? new Error(context, { cause: error }) : error;
	}

	if (typeof error === "string") {
		return context ? new Error(`${context}: ${error}`) : new Error(error);
	}

	if (typeof error === "object" && error !== null) {
		const stringifiedErrorResult = fromThrowable(
			() => JSON.stringify(error),
			(_) => new Error("Failed to stringify error object"),
		)();

		if (stringifiedErrorResult.isErr()) {
			return context ? new Error(context, { cause: stringifiedErrorResult.error }) : stringifiedErrorResult.error;
		}

		return context ? new Error(`${context}: ${stringifiedErrorResult.value}`) : new Error(stringifiedErrorResult.value);
	}

	return context ? new Error(`${context}: Unknown error`) : new Error("Unknown error");
};
