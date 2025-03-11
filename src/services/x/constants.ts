import { validEnv } from "$/env";

const { X_AUTH_BEARER_TOKEN } = validEnv;
export const X_API_CONFIG = {
	BASE_URL: "https://api.x.com",
	BEARER_TOKEN: X_AUTH_BEARER_TOKEN,
	BASE_HEADERS: {
		"Content-Type": "application/json",
		Authorization: `Bearer ${X_AUTH_BEARER_TOKEN}`,
	},
	PATHS: {
		STREAM_RULES: "2/tweets/search/stream/rules",
		FILTERED_STREAM_WITH_USER: "2/tweets/search/stream?expansions=author_id",
		USER_BY_USERNAME: (username: string) => `2/users/by/username/${username}`,
	},
} as const;

export const FROM_USER_ID_STREAM_VALUE_REGEX = /^from:[0-9]+$/;

export const X_API_INLINE_ERRORS = {
	INVALID_REQUEST: {
		title: "Invalid Request Problem",
		type: "https://api.X.com/2/problems/invalid-request",
	},
	RESOURCE_NOT_FOUND: {
		title: "Resource Not Found Problem",
		type: "https://api.X.com/2/problems/resource-not-found",
	},
	RESOURCE_UNAUTHORIZED: {
		title: "Resource Unauthorized Problem",
		type: "https://api.X.com/2/problems/not-authorized-for-resource",
	},
	CLIENT_FORBIDDEN: {
		title: "Client Forbidden Problem",
		type: "https://api.X.com/2/problems/client-forbidden",
	},
	DISALLOWED_RESOURCE: {
		title: "Disallowed Resource Problem",
		type: "https://api.X.com/2/problems/disallowed-resource",
	},
	UNSUPPORTED_AUTHENTICATION: {
		title: "Unsupported Authentication Problem",
		type: "https://api.X.com/2/problems/unsupported-authentication",
	},
	USAGE_CAPPED: {
		title: "Usage Capped Problem",
		type: "https://api.X.com/2/problems/usage-capped",
	},
	CONNECTION_EXCEPTION: {
		title: "Connection Exception Problem",
		type: "https://api.X.com/2/problems/streaming-connection",
	},
	CLIENT_DISCONNECTED: {
		title: "Client Disconnected Problem",
		type: "https://api.X.com/2/problems/client-disconnected",
	},
	OPERATIONAL_DISCONNECT: {
		title: "Operational Disconnect Problem",
		type: "https://api.X.com/2/problems/operational-disconnect",
	},
	RULE_CAP: {
		title: "Rule Cap Problem",
		type: "https://api.X.com/2/problems/rule-cap",
	},
	RULE_LENGTH: {
		title: "Rule Length Problem",
		type: "https://api.X.com/2/problems/rule-length",
	},
	INVALID_RULES: {
		title: "Invalid Rules Problem",
		type: "https://api.X.com/2/problems/invalid-rules",
	},
	DUPLICATE_RULES: {
		title: "Duplicate Rules Problem",
		type: "https://api.X.com/2/problems/duplicate-rules",
	},
} as const;

export const RECONNECTABLE_STREAM_INLINE_ERROR_TYPES = [
	X_API_INLINE_ERRORS.CLIENT_DISCONNECTED.type,
	X_API_INLINE_ERRORS.OPERATIONAL_DISCONNECT.type,
	X_API_INLINE_ERRORS.USAGE_CAPPED.type,
	X_API_INLINE_ERRORS.CONNECTION_EXCEPTION.type,
] as const;
