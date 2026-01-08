import { queryOptions } from '@tanstack/react-query';
import { MusicBrainzApi } from 'musicbrainz-api';

import packageJson from '../../../../../package.json';

import { queryKeys } from '/@/renderer/api/query-keys';

export const musicbrainzApi = new MusicBrainzApi({
    appContactInfo: packageJson.homepage,
    appName: packageJson.name,
    appVersion: packageJson.version,
});

// Cache all musicbrainz api results for 5 minutes
const CACHE_TIME = 1000 * 60 * 5;

export const musicbrainzQueries = {
    artist: (args: { mbzArtistId: string }) => {
        return queryOptions({
            gcTime: CACHE_TIME,
            queryFn: () =>
                musicbrainzApi.lookup('artist', args.mbzArtistId, [
                    'releases',
                    'recordings',
                    'release-groups',
                    'works',
                    'media',
                ]),
            queryKey: queryKeys.musicbrainz.artist(args.mbzArtistId),
            staleTime: CACHE_TIME,
        });
    },
};
