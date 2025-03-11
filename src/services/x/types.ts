import type * as v from "valibot";
import type { RECONNECTABLE_STREAM_INLINE_ERROR_TYPES } from "./constants";
import type {
	xApiFilteredStreamWithUserResponseSchema,
	xApiInlineErrorSchema,
	xMatchingUserRuleSchema,
	xTweetSchema,
	xUserSchema,
	xUserStreamRuleSchema,
	xUserStreamRuleTagSchema,
} from "./schemas";

export type XUserStreamRuleTag = v.InferOutput<typeof xUserStreamRuleTagSchema>;
export type XUserStreamRule = v.InferOutput<typeof xUserStreamRuleSchema>;
export type XAddUserStreamRule = Omit<XUserStreamRule, "id">;
export type XAddUserStreamRuleRequest = {
	add: XAddUserStreamRule[];
};
export type XApiDeleteUserStreamRuleRequest = {
	delete: {
		ids: string[];
	};
};
export type XApiInlineError = v.InferOutput<typeof xApiInlineErrorSchema>;
export type XApiFilteredStreamWithUserResponse = v.InferOutput<typeof xApiFilteredStreamWithUserResponseSchema>;

type XTweet = v.InferOutput<typeof xTweetSchema>;
type XUser = v.InferOutput<typeof xUserSchema>;
type XMatchingUserRule = v.InferOutput<typeof xMatchingUserRuleSchema>;

export type EnhancedTweet = XTweet & {
	author: XUser;
	matchingRules: XMatchingUserRule[];
};

export type XApiReconnectableStreamErrorType = (typeof RECONNECTABLE_STREAM_INLINE_ERROR_TYPES)[number];
