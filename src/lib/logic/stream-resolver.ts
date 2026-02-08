import { BackendClient } from '$lib/backend';

export interface StreamGroup {
    quality: string;
    streams: any[];
}

export interface StreamResponse {
    streams: Record<string, any[]>;
}

export class StreamService {
    private client: BackendClient;

    constructor() {
        this.client = new BackendClient();
    }

    async fetchStreams(urlOrSid: string, sn?: number, en?: number): Promise<{
        streams: Record<string, any[]>;
        activeStream: any | undefined;
        quality: string | undefined;
    }> {
        let streamList: any = [];

        if (urlOrSid.startsWith('http')) {
            streamList = await this.client.getStreams(urlOrSid);
        } else if (sn && en) {
            streamList = await this.client.getSeriesStreams(urlOrSid, sn, en);
        }

        // Case 1: Already grouped
        if (streamList && !Array.isArray(streamList) && streamList.streams) {
            const priorities = ['4k', '1080p', '720p', 'other'];
            let activeStream = undefined;
            let currentPlayQuality = undefined;

            for (const q of priorities) {
                if (streamList.streams[q]?.length > 0) {
                    activeStream = streamList.streams[q][0];
                    currentPlayQuality = q;
                    break;
                }
            }
            const qualities = Object.keys(streamList.streams);
            if (!activeStream && qualities.length > 0) {
                activeStream = streamList.streams[qualities[0]][0];
                currentPlayQuality = qualities[0];
            }
            return { streams: streamList.streams, activeStream, quality: currentPlayQuality };
        }

        // Case 2: Array of streams, need grouping
        const grouped: Record<string, any[]> = {};
        ['4k', '1080p', '720p', 'other'].forEach((q) => (grouped[q] = []));

        if (Array.isArray(streamList)) {
            for (const s of streamList) {
                let quality = s.quality?.toLowerCase() || 'other';
                if (['4k', '2160p', 'uhl'].includes(quality)) quality = '4k';
                else if (['1080p', 'fhd'].includes(quality)) quality = '1080p';
                else if (['720p', 'hd'].includes(quality)) quality = '720p';
                else quality = 'other';

                grouped[quality].push({ ...s, quality });
            }
        }

        // Determine active stream
        let activeStream = undefined;
        let currentPlayQuality = undefined;
        const priorities = ['4k', '1080p', '720p', 'other'];
        for (const q of priorities) {
            if (grouped[q]?.length > 0) {
                activeStream = grouped[q][0];
                currentPlayQuality = q;
                break;
            }
        }

        return { streams: grouped, activeStream, quality: currentPlayQuality };
    }

    async resolveStream(url: string): Promise<{
        videoUrl: string;
        downloader?: string;
        audios?: any;
        duration?: number;
        error?: any;
    }> {
        try {
            const data = await this.client.resolveStream(url);

            if (data && data.audios) {
                let pickedKey = Object.keys(data.audios)[0];
                const downloader = data.downloader || data.streamlink?.downloader;

                if (downloader === 'realdebrid') {
                    const mpdKey = Object.keys(data.audios).find((k) =>
                        data.audios[k].url.includes('.mpd')
                    );
                    if (mpdKey) pickedKey = mpdKey;
                }

                if (pickedKey) {
                    const audioData = data.audios[pickedKey];
                    return {
                        videoUrl: audioData.url,
                        downloader,
                        audios: data.audios,
                        duration: data.duration || 0
                    };
                }
            } else if (data && data.original) {
                return {
                    videoUrl: data.original,
                    downloader: data.downloader || data.streamlink?.downloader,
                    duration: data.duration || 0
                };
            }
            throw new Error('No playable URL found');
        } catch (e) {
            // Fallback to original URL
            return { videoUrl: url, error: e };
        }
    }
}
