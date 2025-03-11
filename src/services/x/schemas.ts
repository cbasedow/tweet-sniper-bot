import * as v from "valibot";
import { FROM_USER_ID_STREAM_VALUE_REGEX } from "./constants";

export const xApiInlineErrorSchema = v.object({
	title: v.pipe(v.string(), v.minLength(1)),
	type: v.pipe(v.string(), v.minLength(1)),
	detail: v.nullish(v.string()),
	status: v.nullish(v.pipe(v.number(), v.integer())),
});

export const xUserSchema = v.object({
	id: v.pipe(v.string(), v.minLength(1)),
	name: v.pipe(v.string(), v.minLength(1)),
	username: v.pipe(v.string(), v.minLength(1)),
});

export const xApiUserByUsernameResponseSchema = v.object({
	data: v.nullish(xUserSchema),
	errors: v.nullish(v.array(xApiInlineErrorSchema)),
});

export const xUserStreamRuleTagSchema = v.union([
	v.literal("crypto"),
	v.literal("influencer"),
	v.literal("politics"),
	v.literal("celeb"),
]);

export const xUserStreamRuleSchema = v.object({
	id: v.pipe(v.string(), v.minLength(1)),
	value: v.pipe(v.string(), v.minLength(1), v.regex(FROM_USER_ID_STREAM_VALUE_REGEX)),
	tag: xUserStreamRuleTagSchema,
});

export const xApiGetAllUserStreamRulesResponseSchema = v.object({
	data: v.nullish(v.array(xUserStreamRuleSchema)),
	errors: v.nullish(v.array(xApiInlineErrorSchema)),
});

export const xApiAddUserStreamRuleResponseSchema = v.object({
	meta: v.object({
		summary: v.nullish(
			v.object({
				created: v.pipe(v.number(), v.integer()),
			}),
		),
	}),
	errors: v.nullish(v.array(xApiInlineErrorSchema)),
});

export const xApiDeleteUserStreamRuleResponseSchema = v.object({
	meta: v.object({
		summary: v.nullish(
			v.object({
				deleted: v.pipe(v.number(), v.integer()),
			}),
		),
	}),
	errors: v.nullish(v.array(xApiInlineErrorSchema)),
});

export const xTweetSchema = v.object({
	id: v.pipe(v.string(), v.minLength(1)),
	text: v.pipe(v.string(), v.minLength(1)),
});

export const xMatchingUserRuleSchema = v.object({
	id: v.pipe(v.string(), v.minLength(1)),
	tag: xUserStreamRuleTagSchema,
});

export const xIncludesUserSchema = v.object({
	users: v.array(xUserSchema),
});

export const xApiFilteredStreamWithUserResponseSchema = v.object({
	data: v.nullish(xTweetSchema),
	errors: v.nullish(v.array(xApiInlineErrorSchema)),
	includes: v.nullish(xIncludesUserSchema),
	matching_rules: v.nullish(v.array(xMatchingUserRuleSchema)),
});
