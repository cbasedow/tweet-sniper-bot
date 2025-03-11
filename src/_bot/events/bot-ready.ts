import { validEnv } from "$/env";
import { dexscreenerService } from "$/services/dexscreener";
import { xService } from "$/services/x";
import type { XUserStreamRuleTag } from "$/services/x/types";
import { formatUnknownError } from "$/utils/format-unknown-error";
import { logger } from "$/utils/logger";
import { fromPromise } from "neverthrow";
import { ActionRow, Button, createEvent } from "seyfert";
import { ButtonStyle } from "seyfert/lib/types";

// Solana base58 address regex (global search with word boundaries)
const SOLANA_BASE58_ADDRESS_REGEX = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

const TAG_TYPE_TO_CHANNEL_ID_MAP: Record<XUserStreamRuleTag, string> = {
	celeb: validEnv.DISCORD_CELEB_CHANNEL_ID,
	crypto: validEnv.DISCORD_CRYPTO_CHANNEL_ID,
	influencer: validEnv.DISCORD_INFLUENCER_CHANNEL_ID,
	politics: validEnv.DISCORD_POLITICS_CHANNEL_ID,
} as const;

const BULLX_SOLANA_CHAIN_ID = 1399811149 as const;

const TRADING_PLATFORM_URLS = {
	AXIOM: (tokenAddress: string) => `https://axiom.xyz/token/${tokenAddress}`,
	BULLX: (tokenAddress: string) => `https://bullx.io/terminal?chainId=${BULLX_SOLANA_CHAIN_ID}&address=${tokenAddress}`,
	PHOTON: (pairAddress: string) => `https://photon-sol.tinyastro/en/lp/${pairAddress}`,
} as const;

type TradingPlatform = keyof typeof TRADING_PLATFORM_URLS;
type TradingPlatformUrl = (address: string) => string;

const formatTweetUrl = (authorUsername: string, tweetId: string): string => {
	return `https://x.com/${authorUsername}/status/${tweetId}`;
};

export default createEvent({
	data: {
		once: true,
		name: "botReady",
	},
	async run(user, client) {
		logger.info(`Bot is ready as @${user.username}!`);

		const enhancedTweetStream = xService.startEnhancedTweetStream();

		logger.info("Started enhanced tweet stream");

		for await (const tweetResult of enhancedTweetStream) {
			if (tweetResult.isErr()) {
				// Fatal stream error = shutdown bot
				logger.error({
					msg: "Fatal tweet stream error, shutting down bot",
					error: tweetResult.error,
				});
				process.exit(1);
			}

			const enhancedTweet = tweetResult.value;

			logger.info({
				msg: "Received tweet",
				tweet: enhancedTweet,
			});

			const channelId = TAG_TYPE_TO_CHANNEL_ID_MAP[enhancedTweet.matchingRules[0].tag];

			const channelResult = await fromPromise(client.channels.fetch(channelId), (error) =>
				formatUnknownError(error, `Error fetching channel ${channelId}`),
			);

			if (channelResult.isErr()) {
				logger.error({
					msg: "Fatal channel fetch error, shutting down bot",
					error: channelResult.error,
				});
				process.exit(1);
			}

			const channel = channelResult.value;
			const tweetUrl = formatTweetUrl(enhancedTweet.author.username, enhancedTweet.id);

			const sendDefaultTweetMessage = (): Promise<void> => {
				return fromPromise(
					client.messages.write(channel.id, {
						content: `**New tweet from ${enhancedTweet.author.username}:**\n${tweetUrl}`,
					}),
					(error) => formatUnknownError(error, `Error sending default tweet message to channel ${channel.id}`),
				).match(
					() => {
						logger.info({
							msg: `Sent default tweet message to channel ${channel.id}`,
							tweetUrl,
						});
					},
					(error) => {
						logger.error({
							error: error,
							msg: `Error sending default tweet message to channel ${channel.id}`,
						});
					},
				);
			};

			const solanaAddressMatch = enhancedTweet.text.match(SOLANA_BASE58_ADDRESS_REGEX);

			// If no solana address match, send default tweet message and continue
			if (!solanaAddressMatch) {
				await sendDefaultTweetMessage();
				continue;
			}

			let sentTweetWithTradingPlatformButtons = false;
			for (const address of solanaAddressMatch) {
				const dexscreenerPairAddressResult = await dexscreenerService.getPairAddressByTokenAddress(address);

				if (dexscreenerPairAddressResult.isErr()) {
					continue;
				}

				const dexscreenerPairAddress = dexscreenerPairAddressResult.value;

				if (!dexscreenerPairAddress) {
					continue;
				}

				const buttonActionRow = new ActionRow<Button>();

				for (const [platform, url] of Object.entries(TRADING_PLATFORM_URLS) as [
					TradingPlatform,
					TradingPlatformUrl,
				][]) {
					buttonActionRow.addComponents(
						new Button()
							.setLabel(platform)
							.setStyle(ButtonStyle.Link)
							.setURL(`${platform === "PHOTON" ? url(dexscreenerPairAddress) : url(address)}`),
					);
				}

				await fromPromise(
					client.messages.write(channel.id, {
						content: `**New tweet from ${enhancedTweet.author.username}:**\n${tweetUrl}`,
						components: [buttonActionRow],
					}),
					(error) => formatUnknownError(error, `Error sending tweet message to channel ${channel.id}`),
				).match(
					() => {
						logger.info({
							msg: `Sent tweet message with trading platform buttons to channel ${channel.id}`,
							tweetUrl,
						});
						sentTweetWithTradingPlatformButtons = true;
					},
					(error) => {
						logger.error({
							msg: `Error sending tweet message with trading platform buttons to channel ${channel.id}`,
							error: error,
						});
					},
				);

				break; // Exit address loop after sending tweet with button action row
			}

			// If we didn't send a tweet with trading platform buttons, send the default tweet message
			if (!sentTweetWithTradingPlatformButtons) {
				await sendDefaultTweetMessage();
			}
		}
	},
});
