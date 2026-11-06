import { NeedsAttention } from "../poller";
import { getSettings } from "../settings";

export type ChannelStats = {
  // Null when the channel hides its count.
  subscribers: number | null;
  views: number;
};

type ChannelsResponse = {
  items?: { statistics: { subscriberCount?: string; viewCount: string } }[];
  error?: { errors?: { reason?: string }[] };
};

// One call costs 1 of the API key's 10,000 free units a day. The key goes in a
// header, not the URL, so it can't end up in a log.
export async function loadChannelStats(): Promise<ChannelStats> {
  const { youtubeApiKey, youtubeChannel } = await getSettings();
  const channel = youtubeChannel?.trim();
  if (!youtubeApiKey?.trim() || !channel) throw new NeedsAttention("Set up");

  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "statistics");
  url.searchParams.set(channel.startsWith("@") ? "forHandle" : "id", channel);
  const response = await fetch(url, {
    headers: { "X-Goog-Api-Key": youtubeApiKey.trim() },
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await response.json()) as ChannelsResponse;

  if (!response.ok) {
    const reason = body.error?.errors?.[0]?.reason ?? "";
    // Over the daily quota, or YouTube having a moment: it'll pass by itself.
    if (response.status >= 500 || reason.toLowerCase().includes("quota")) {
      throw new Error(`YouTube answered ${response.status} ${reason}`);
    }
    throw new NeedsAttention("API key");
  }
  const statistics = body.items?.[0]?.statistics;
  if (!statistics) throw new NeedsAttention("Channel");
  return {
    subscribers: statistics.subscriberCount === undefined ? null : Number(statistics.subscriberCount),
    views: Number(statistics.viewCount),
  };
}
