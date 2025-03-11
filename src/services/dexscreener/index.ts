import { fetchWithRetry } from "$/utils/fetch-with-retry";
import { formatUnknownError } from "$/utils/format-unknown-error";
import { validateSchema } from "$/utils/validate-schema";
import { type ResultAsync, fromPromise, okAsync } from "neverthrow";
import * as v from "valibot";
import { DEXSCREENER_API_CONFIG } from "./constants";
import { dexscreenerPairSchema } from "./schemas";

const { BASE_URL, BASE_HEADERS, SOLANA_CHAIN_ID } = DEXSCREENER_API_CONFIG;

const createDexscreenerService = () => {
	return {
		getPairAddressByTokenAddress: (tokenAddress: string): ResultAsync<string | null, Error> => {
			const url = `${BASE_URL}/token-pairs/v1/${SOLANA_CHAIN_ID}/${tokenAddress}`;

			return fetchWithRetry(url, {
				method: "GET",
				headers: BASE_HEADERS,
			})
				.andThen((okResponse) => {
					return fromPromise(okResponse.json(), (error) =>
						formatUnknownError(error, `Error parsing json from url ${url}`),
					)
						.andThen((data) => validateSchema(v.nullish(v.array(dexscreenerPairSchema)), data))
						.andThen((pairs) => {
							// Return null if no pairs found
							if (!pairs || pairs.length === 0) {
								return okAsync(null);
							}

							// First pair will be the main/current pair
							return okAsync(pairs[0].pairAddress);
						});
				})
				.mapErr(
					(error) =>
						new Error(`Error getting Dexscreener pair address by token address ${tokenAddress}`, { cause: error }),
				);
		},
	};
};

export const dexscreenerService = createDexscreenerService();
