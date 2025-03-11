import { fetchWithRetry } from "$/utils/fetch-with-retry";
import { formatUnknownError } from "$/utils/format-unknown-error";
import type { BaseValibotSchema } from "$/utils/valibot";
import { validateSchema } from "$/utils/validate-schema";
import type { ResultAsync } from "neverthrow";
import { fromPromise } from "neverthrow";
import type * as v from "valibot";
import { RECONNECTABLE_STREAM_INLINE_ERROR_TYPES, X_API_CONFIG } from "./constants";
import type { XApiInlineError, XApiReconnectableStreamErrorType } from "./types";

export const formatXApiInlineErrors = (inlineErrors: XApiInlineError[]): Error => {
	return new Error(inlineErrors.map((inlineError) => `${inlineError.title}: ${inlineError.detail}`).join("\n"));
};

const { BASE_URL, BASE_HEADERS } = X_API_CONFIG;

type UrlRequestParams = {
	path: string;
	queryParams?: URLSearchParams;
};

export const sendXApiGetRequest = <TSchema extends BaseValibotSchema>(
	urlRequestParams: UrlRequestParams,
	responseSchema: TSchema,
): ResultAsync<v.InferOutput<TSchema>, Error> => {
	const { path, queryParams } = urlRequestParams;

	const url = `${BASE_URL}/${path}${queryParams ? `?${queryParams.toString()}` : ""}`;

	return fetchWithRetry(url, {
		method: "GET",
		headers: BASE_HEADERS,
	}).andThen((okResponse) => {
		return fromPromise(okResponse.json(), (error) => {
			return formatUnknownError(error, `Failed to parse JSON response body for ${url}`);
		}).andThen((data) => validateSchema(responseSchema, data));
	});
};

export const sendXApiPostRequest = <TSchema extends BaseValibotSchema>(
	urlRequestParams: UrlRequestParams,
	requestBody: unknown,
	responseSchema: TSchema,
): ResultAsync<v.InferOutput<TSchema>, Error> => {
	const { path, queryParams } = urlRequestParams;

	const url = `${BASE_URL}/${path}${queryParams ? `?${queryParams.toString()}` : ""}`;

	return fetchWithRetry(url, {
		method: "POST",
		headers: BASE_HEADERS,
		body: JSON.stringify(requestBody),
	}).andThen((okResponse) => {
		return fromPromise(okResponse.json(), (error) => {
			return formatUnknownError(error, `Failed to parse JSON response body for ${url}`);
		}).andThen((data) => validateSchema(responseSchema, data));
	});
};

export const isReconnectableStreamErrorType = (type: string): type is XApiReconnectableStreamErrorType => {
	return RECONNECTABLE_STREAM_INLINE_ERROR_TYPES.includes(type as XApiReconnectableStreamErrorType);
};
