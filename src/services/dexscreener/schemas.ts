import * as v from "valibot";
import { DEXSCREENER_API_CONFIG } from "./constants";

// This is the only fields we currently need from the dexscreener api
export const dexscreenerPairSchema = v.object({
	chainId: v.literal(DEXSCREENER_API_CONFIG.SOLANA_CHAIN_ID),
	pairAddress: v.pipe(v.string(), v.minLength(1)),
});
