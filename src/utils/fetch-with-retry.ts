import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { formatUnknownError } from "./format-unknown-error";
import { logger } from "./logger";

interface EnhancedFetchOptions extends RequestInit {
	maxRetries?: number;
	retryDelay?: number;
	timeout?: number;
}

const DEFAULT_FETCH_OPTIONS = {
	maxRetries: 3,
	retryDelay: 1000,
	timeout: 5000,
} as const;

export const fetchWithRetry = (url: string, options: EnhancedFetchOptions = {}): ResultAsync<Response, Error> => {
	const {
		maxRetries = DEFAULT_FETCH_OPTIONS.maxRetries,
		retryDelay = DEFAULT_FETCH_OPTIONS.retryDelay,
		timeout = DEFAULT_FETCH_OPTIONS.timeout,
		...fetchOptions
	} = options;

	const shouldRetry = (response: Response, attempt: number): boolean => {
		return attempt < maxRetries && (response.status >= 500 || response.status === 429);
	};

	const executeFetchWithRetry = (attempt: number): ResultAsync<Response, Error> => {
		const signal = AbortSignal.timeout(timeout);

		return ResultAsync.fromPromise(
			fetch(url, {
				...fetchOptions,
				signal,
			}),
			(error) => formatUnknownError(error, `Failed to fetch ${url}`),
		).andThen((response) => {
			if (!response.ok && shouldRetry(response, attempt)) {
				const delay = retryDelay * 2 ** attempt;

				logger.debug({
					msg: `Retrying fetch request to ${url}`,
					attempt: attempt + 1,
					maxRetries,
					delay,
					status: `${response.status} ${response.statusText}`,
				});

				return ResultAsync.fromSafePromise(new Promise((resolve) => setTimeout(resolve, delay))).andThen(() =>
					executeFetchWithRetry(attempt + 1),
				);
			}

			if (!response.ok) {
				return errAsync(new Error(`Failed to fetch ${url}: HTTP error ${response.status} ${response.statusText}`));
			}

			return okAsync(response);
		});
	};

	return executeFetchWithRetry(0);
};
