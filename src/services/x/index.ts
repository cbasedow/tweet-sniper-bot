import { fetchWithRetry } from "$/utils/fetch-with-retry";
import { formatUnknownError } from "$/utils/format-unknown-error";
import { logger } from "$/utils/logger";
import { validateSchema } from "$/utils/validate-schema";
import type { Result, ResultAsync } from "neverthrow";
import { err, errAsync, fromPromise, fromThrowable, ok, okAsync } from "neverthrow";
import { X_API_CONFIG } from "./constants";
import {
	xApiAddUserStreamRuleResponseSchema,
	xApiDeleteUserStreamRuleResponseSchema,
	xApiFilteredStreamWithUserResponseSchema,
	xApiGetAllUserStreamRulesResponseSchema,
	xApiUserByUsernameResponseSchema,
} from "./schemas";
import type {
	EnhancedTweet,
	XAddUserStreamRule,
	XAddUserStreamRuleRequest,
	XApiDeleteUserStreamRuleRequest,
	XApiFilteredStreamWithUserResponse,
	XUserStreamRule,
	XUserStreamRuleTag,
} from "./types";
import {
	formatXApiInlineErrors,
	isReconnectableStreamErrorType,
	sendXApiGetRequest,
	sendXApiPostRequest,
} from "./utils";

const { BASE_URL, BEARER_TOKEN, PATHS } = X_API_CONFIG;
const {
	STREAM_RULES: STREAM_RULES_PATH,
	USER_BY_USERNAME: USER_BY_USERNAME_PATH,
	FILTERED_STREAM_WITH_USER: FILTERED_STREAM_WITH_USER_PATH,
} = PATHS;

const STREAM_BASE_RECONNECT_DELAY = 1000; // 1 second
const STREAM_MAX_RECONNECT_DELAY = 60 * 5 * 1000; // 5 minutes
const STREAM_MAX_RECONNECT_ATTEMPTS = 10;

export const createXService = () => {
	const getUserIdByUsername = (username: string): ResultAsync<string, Error> => {
		return sendXApiGetRequest(
			{
				path: USER_BY_USERNAME_PATH(username),
			},
			xApiUserByUsernameResponseSchema,
		)
			.andThen((userByUsernameResponse) => {
				const { data: user } = userByUsernameResponse;

				if (!user) {
					return errAsync(new Error("No X User found"));
				}

				return okAsync(user.id);
			})
			.mapErr((error) => new Error(`Error getting x User ID by username ${username}`, { cause: error }));
	};

	const getAllUserStreamRules = (): ResultAsync<XUserStreamRule[], Error> => {
		return sendXApiGetRequest(
			{
				path: STREAM_RULES_PATH,
			},
			xApiGetAllUserStreamRulesResponseSchema,
		)
			.andThen(({ data: streamRules, errors: inlineErrors }) => {
				if (streamRules && streamRules.length > 0) {
					return okAsync(streamRules);
				}

				if (inlineErrors && inlineErrors.length > 0) {
					return errAsync(formatXApiInlineErrors(inlineErrors));
				}

				return okAsync([]);
			})
			.mapErr((error) => new Error("Error getting all user stream rules", { cause: error }));
	};

	const addUserStreamRule = (rule: XAddUserStreamRule): ResultAsync<void, Error> => {
		const requestBody: XAddUserStreamRuleRequest = {
			add: [rule],
		};

		return sendXApiPostRequest(
			{
				path: STREAM_RULES_PATH,
			},
			requestBody,
			xApiAddUserStreamRuleResponseSchema,
		)
			.andThen(({ meta: { summary }, errors: inlineErrors }) => {
				if (summary?.created) {
					return okAsync(undefined);
				}

				if (inlineErrors && inlineErrors.length > 0) {
					return errAsync(formatXApiInlineErrors(inlineErrors));
				}

				return errAsync(new Error("Unknown error adding user stream rule"));
			})
			.mapErr((error) => new Error("Error adding user stream rule", { cause: error }));
	};

	const deleteUserStreamRule = (ruleId: string): ResultAsync<void, Error> => {
		const requestBody: XApiDeleteUserStreamRuleRequest = {
			delete: {
				ids: [ruleId],
			},
		};

		return sendXApiPostRequest(
			{
				path: STREAM_RULES_PATH,
			},
			requestBody,
			xApiDeleteUserStreamRuleResponseSchema,
		)
			.andThen(({ meta: { summary }, errors: inlineErrors }) => {
				if (summary?.deleted) {
					return okAsync(undefined);
				}

				if (inlineErrors && inlineErrors.length > 0) {
					return errAsync(formatXApiInlineErrors(inlineErrors));
				}

				return errAsync(new Error("Unknown error deleting user stream rule"));
			})
			.mapErr((error) => new Error("Error deleting user stream rule", { cause: error }));
	};

	const addUserToTweetStream = (username: string, tag: XUserStreamRuleTag): ResultAsync<void, Error> => {
		return getUserIdByUsername(username)
			.andThen((userId) => {
				return getAllUserStreamRules().andThen((streamRules) => {
					logger.info({
						msg: "User stream rules",
						streamRules,
					});
					const duplicateRule = streamRules.find((rule) => rule.value === `from:${userId}`);

					if (duplicateRule) {
						return errAsync(new Error(`User ${username} is already being tracked with tag ${tag}`));
					}

					const rule: XAddUserStreamRule = {
						value: `from:${userId}`,
						tag,
					};

					return addUserStreamRule(rule);
				});
			})
			.mapErr((error) => new Error(`Error adding user ${username} to tweet stream`, { cause: error }));
	};

	const removeUserFromTweetStream = (username: string): ResultAsync<void, Error> => {
		return getUserIdByUsername(username)
			.andThen((userId) => {
				return getAllUserStreamRules().andThen((streamRules) => {
					const ruleToRemove = streamRules.find((rule) => rule.value === `from:${userId}`);

					if (!ruleToRemove) {
						return errAsync(new Error(`User ${username} is not being tracked`));
					}

					return deleteUserStreamRule(ruleToRemove.id);
				});
			})
			.mapErr((error) => new Error(`Error removing user ${username} from tweet stream`, { cause: error }));
	};

	const connectToFilteredStream = (): ResultAsync<ReadableStream<Uint8Array<ArrayBufferLike>>, Error> => {
		const url = `${BASE_URL}/${FILTERED_STREAM_WITH_USER_PATH}` as const;

		return fetchWithRetry(url, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${BEARER_TOKEN}`,
			},
			timeout: null,
		})
			.andThen((okResponse) => {
				const stream = okResponse.body;

				if (!stream) {
					return errAsync(new Error("No stream body found"));
				}

				return okAsync(stream);
			})
			.mapErr((error) => new Error("Error connecting to filtered stream", { cause: error }));
	};

	async function* processFilteredStream(
		stream: ReadableStream<Uint8Array<ArrayBufferLike>>,
	): AsyncGenerator<Result<XApiFilteredStreamWithUserResponse, Error>> {
		const reader = stream.getReader();
		const decoder = new TextDecoder();

		let buffer = "";

		const cleanup = () => {
			reader.releaseLock();
			return fromPromise(reader.cancel("Filtered stream processing terminated"), (error) =>
				formatUnknownError(error, "Error cancelling filtered stream"),
			);
		};

		while (true) {
			const readResult = await fromPromise(reader.read(), (error) =>
				formatUnknownError(error, "Error reading filtered stream"),
			);

			if (readResult.isErr()) {
				logger.error({
					msg: "Fatal stream read error",
					error: readResult.error,
				});

				await cleanup();

				yield err(readResult.error);
				break;
			}

			const { done, value } = readResult.value;

			// Stream closes without errors
			if (done) {
				logger.info({
					msg: "Filtered stream closed naturally",
				});
				reader.releaseLock();
				// No need to cancel the stream when it closes naturally
				break; // Exit loop if stream is done
			}

			buffer += decoder.decode(value, { stream: true });

			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			const currNonEmptyLines = lines.filter((line) => line.trim() !== "");
			const parsedJsonDataResults: Result<unknown, Error>[] = [];

			for (const line of currNonEmptyLines) {
				parsedJsonDataResults.push(
					fromThrowable(
						() => JSON.parse(line) as unknown,
						(error) => formatUnknownError(error, "Error parsing filtered stream JSON data"),
					)(),
				);
			}

			for (const parsedJsonDataResult of parsedJsonDataResults) {
				yield parsedJsonDataResult.andThen((jsonData) =>
					validateSchema(xApiFilteredStreamWithUserResponseSchema, jsonData),
				);
			}
		}
	}

	const getProcessedFilteredStreamWithRetry = async function* (): AsyncGenerator<Result<EnhancedTweet, Error>> {
		let reconnectAttempts = 0;

		while (reconnectAttempts < STREAM_MAX_RECONNECT_ATTEMPTS) {
			// Connect to filtered stream
			const streamResult = await connectToFilteredStream();

			// If error connecting to stream, yield error and break
			if (streamResult.isErr()) {
				yield err(streamResult.error);
				break;
			}

			const streamProccessor = processFilteredStream(streamResult.value);

			for await (const result of streamProccessor) {
				// If fatal stream error, yield error and break
				if (result.isErr()) {
					yield err(result.error);
					break;
				}

				const { data: tweet, errors: inlineErrors, includes, matching_rules: matchingRules } = result.value;

				const reconnectableInlineError = inlineErrors?.find((inlineError) =>
					isReconnectableStreamErrorType(inlineError.type),
				);

				if (reconnectableInlineError) {
					const backoffDelay = Math.min(
						STREAM_BASE_RECONNECT_DELAY * 2 ** reconnectAttempts,
						STREAM_MAX_RECONNECT_DELAY,
					);

					logger.warn({
						msg: `Reconnectable inline stream error detected, will attempt to reconnect in ${backoffDelay}ms`,
						reconnectableInlineError,
						reconnectAttempt: reconnectAttempts + 1,
					});

					reconnectAttempts++;

					await new Promise((resolve) => setTimeout(resolve, backoffDelay));
					break; // Break from inner loop - this will trigger the outer loop to reconnect
				}

				if (tweet && includes && matchingRules) {
					const enhancedTweet: EnhancedTweet = {
						...tweet,
						author: includes.users[0],
						matchingRules,
					};

					yield ok(enhancedTweet);
				}
			}
		}

		return err(new Error("Max filtered stream reconnect attempts reached"));
	};

	const startEnhancedTweetStream = async function* (): AsyncGenerator<Result<EnhancedTweet, Error>> {
		for await (const result of getProcessedFilteredStreamWithRetry()) {
			yield result;
		}
	};
	return {
		addUserToTweetStream,
		removeUserFromTweetStream,
		startEnhancedTweetStream,
	};
};

export const xService = createXService();
