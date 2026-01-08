import { queryOptions } from '@tanstack/react-query';
import memoize from 'lodash/memoize';
import { IArtist, IRelease, IReleaseGroup, MusicBrainzApi } from 'musicbrainz-api';

import packageJson from '../../../../../package.json';

import { queryKeys } from '/@/renderer/api/query-keys';
import {
    Album,
    AlbumArtist,
    LibraryItem,
    RelatedArtist,
    ServerType,
} from '/@/shared/types/domain-types';

export const musicbrainzApi = new MusicBrainzApi({
    appContactInfo: packageJson.homepage,
    appName: packageJson.name,
    appVersion: packageJson.version,
});

// Cache all musicbrainz api results for 5 minutes
const CACHE_TIME = 1000 * 60 * 5;

const artistSelect = memoize(
    ({ data, meta }: { data: IArtist; meta: { albumArtist: AlbumArtist } }) => {
        const releaseGroups =
            data['release-groups']?.reduce(
                (
                    acc: Record<
                        string,
                        {
                            originalDate: null | string;
                            primaryReleaseType: null | string;
                            secondaryReleaseTypes: string[];
                        }
                    >,
                    releaseGroup: IReleaseGroup,
                ) => {
                    const primaryReleaseType = releaseGroup['primary-type'].toLowerCase();
                    const secondaryReleaseTypes = releaseGroup['secondary-types'].map((type) =>
                        type.toLowerCase(),
                    );
                    const originalDate = releaseGroup['first-release-date'];

                    acc[releaseGroup.title] = {
                        originalDate: originalDate,
                        primaryReleaseType: primaryReleaseType,
                        secondaryReleaseTypes: secondaryReleaseTypes,
                    };

                    return acc;
                },
                {} as Record<
                    string,
                    {
                        originalDate: null | string;
                        primaryReleaseType: null | string;
                        secondaryReleaseTypes: string[];
                    }
                >,
            ) || {};

        const albumArtist: RelatedArtist = {
            id: meta.albumArtist.id,
            imageId: meta.albumArtist.imageId,
            imageUrl: meta.albumArtist.imageUrl,
            name: meta.albumArtist.name,
            userFavorite: meta.albumArtist.userFavorite,
            userRating: meta.albumArtist.userRating,
        };

        const albumArtistName = meta.albumArtist.name;

        const albums: Album[] = (data['releases'] || [])
            .map((release: IRelease) => {
                const releaseGroup = releaseGroups[release.title];

                if (!releaseGroup) {
                    return null;
                }

                const releaseType = releaseGroup.primaryReleaseType;
                const secondaryReleaseTypes = releaseGroup.secondaryReleaseTypes || [];
                const releaseTypes = [releaseType, ...secondaryReleaseTypes].filter(
                    (type) => type !== null,
                ) as string[];
                const isCompilation = releaseTypes.includes('compilation');
                const originalDate = releaseGroup.originalDate;
                const originalYear = originalDate ? Number(originalDate.split('-')[0]) : null;
                const releaseDate = release.date ? release.date : null;
                const releaseYear = release.date ? Number(release.date.split('-')[0]) : null;
                const imageUrl = release.media.length > 0 ? getImageUrl(release.id) : null;

                const album: Album = {
                    _itemType: LibraryItem.ALBUM,
                    _serverId: '',
                    _serverType: ServerType.EXTERNAL,
                    albumArtistName: albumArtistName,
                    albumArtists: [albumArtist],
                    artists: [],
                    comment: null,
                    createdAt: '',
                    duration: null,
                    explicitStatus: null,
                    genres: [],
                    id: `musicbrainz-${release.id}`,
                    imageId: null,
                    imageUrl: imageUrl,
                    isCompilation: isCompilation,
                    lastPlayedAt: null,
                    mbzId: release.id,
                    name: release.title,
                    originalDate: originalDate,
                    originalYear: originalYear,
                    participants: {},
                    playCount: null,
                    recordLabels: [],
                    releaseDate: releaseDate,
                    releaseType: releaseType,
                    releaseTypes: releaseTypes,
                    releaseYear: releaseYear,
                    size: null,
                    songCount: null,
                    tags: {},
                    updatedAt: '',
                    userFavorite: false,
                    userRating: null,
                    version: null,
                };

                return album;
            })
            .filter((album): album is Album => album !== null);

        return albums;
    },
);

export const musicbrainzQueries = {
    artist: (args: { mbzArtistId: string }) => {
        return queryOptions({
            gcTime: CACHE_TIME,
            queryFn: async ({ meta }) => {
                const data = await musicbrainzApi.lookup('artist', args.mbzArtistId, [
                    'releases',
                    'release-rels',
                    'recordings',
                    'release-groups',
                    'release-group-rels',
                    'works',
                    'media',
                ]);

                return { data, meta: meta as { albumArtist: AlbumArtist } };
            },
            queryKey: queryKeys.musicbrainz.artist(args.mbzArtistId),
            select: artistSelect,
            staleTime: CACHE_TIME,
        });
    },
};

function getImageUrl(releaseId: string): string {
    return `https://coverartarchive.org/release/${releaseId}/front-250.jpg`;
}
