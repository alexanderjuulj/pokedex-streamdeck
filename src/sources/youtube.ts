import streamDeck from "@elgato/streamdeck";
import { NeedsAttention } from "../poller";
import { getSettings } from "../settings";

export type ChannelStats = {
  // Null when the channel hides its count.
  subscribers: number | null;
  views: number;
};

type ApiError = { error?: { errors?: { reason?: string }[] } };
type ChannelsResponse = {
  items?: {
    statistics: { subscriberCount?: string; viewCount: string };
    contentDetails: { relatedPlaylists: { uploads: string } };
  }[];
};
type PlaylistResponse = {
  items?: { contentDetails: { videoId: string } }[];
  nextPageToken?: string;
};
type VideosResponse = { items?: { statistics: { viewCount?: string } }[] };

// The most either list call takes or returns at once.
const PAGE = 50;

// Each call costs 1 of the API key's 10,000 free units a day. The key goes in a
// header, not the URL, so it can't end up in a log.
async function get<T>(apiKey: string, method: string, params: Record<string, string>) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${method}`);
  url.search = new URLSearchParams(params).toString();
  const response = await fetch(url, {
    headers: { "X-Goog-Api-Key": apiKey },
    signal: AbortSignal.timeout(20_000),
  });
  // A channel with no uploads yet has no uploads playlist.
  if (response.status === 404) return null;
  const body = (await response.json()) as T & ApiError;
  if (!response.ok) {
    const reason = body.error?.errors?.[0]?.reason ?? "";
    // Over the daily quota, or YouTube having a moment: it'll pass by itself.
    if (response.status >= 500 || reason.toLowerCase().includes("quota")) {
      throw new Error(`YouTube answered ${response.status} ${reason}`);
    }
    throw new NeedsAttention("API key");
  }
  return body;
}

async function loadVideoIds(apiKey: string, playlistId: string) {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await get<PlaylistResponse>(apiKey, "playlistItems", {
      part: "contentDetails",
      playlistId,
      maxResults: String(PAGE),
      ...(pageToken ? { pageToken } : {}),
    });
    ids.push(...(page?.items ?? []).map((item) => item.contentDetails.videoId));
    pageToken = page?.nextPageToken;
  } while (pageToken);
  return ids;
}

async function addUpViews(apiKey: string, ids: string[]) {
  let views = 0;
  for (let at = 0; at < ids.length; at += PAGE) {
    const videos = await get<VideosResponse>(apiKey, "videos", {
      part: "statistics",
      id: ids.slice(at, at + PAGE).join(","),
    });
    for (const video of videos?.items ?? []) views += Number(video.statistics.viewCount ?? 0);
  }
  return views;
}

// The views are each public video's added up, Shorts included, rather than the
// channel's own total, which was well behind them when this was written. Both go
// in the log to compare.
export async function loadChannelStats(): Promise<ChannelStats> {
  const { youtubeApiKey, youtubeChannel } = await getSettings();
  const apiKey = youtubeApiKey?.trim();
  const channel = youtubeChannel?.trim();
  if (!apiKey || !channel) throw new NeedsAttention("Set up");

  const channels = await get<ChannelsResponse>(apiKey, "channels", {
    part: "statistics,contentDetails",
    [channel.startsWith("@") ? "forHandle" : "id"]: channel,
  });
  const found = channels?.items?.[0];
  if (!found) throw new NeedsAttention("Channel");

  const { statistics, contentDetails } = found;
  const channelTotal = Number(statistics.viewCount);
  const ids = await loadVideoIds(apiKey, contentDetails.relatedPlaylists.uploads);
  const addedUp = await addUpViews(apiKey, ids);
  streamDeck.logger.info(`Views: ${addedUp} added up from ${ids.length} videos, channel total ${channelTotal}`);

  return {
    subscribers: statistics.subscriberCount === undefined ? null : Number(statistics.subscriberCount),
    views: ids.length > 0 ? addedUp : channelTotal,
  };
}
