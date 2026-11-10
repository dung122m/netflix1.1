import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toCompactDetailPayload,
  unpackDetailPayload,
} from '@/services/movies/service';
import {
  packRecommendationsPayload,
  unpackRecommendationsPayload,
} from '@/app/api/movies/recommendations/route';

describe('Redis Bandwidth Optimization Test Suite', () => {
  describe('1. Movie Detail Payload Optimization', () => {
    it('1.1. Single movie (1 ep) preserves streaming links in compact payload', () => {
      const singleMovie = {
        status: true,
        msg: 'done',
        movie: {
          name: 'Vua Mạo Hiểm',
          slug: 'vua-mao-hiem',
          origin_name: 'Dr. Wai in The Scripture with No Words',
          thumb_url: 'https://img.phimapi.com/vua-mao-hiem-thumb.jpg',
          poster_url: 'https://img.phimapi.com/vua-mao-hiem-poster.jpg',
        },
        episodes: [
          {
            server_name: 'PhimAPI #1',
            server_data: [
              {
                name: 'Full',
                slug: 'full',
                link_embed: 'https://vip.opstream16.com/share/vua-mao-hiem-embed',
                link_m3u8: 'https://vip.opstream16.com/20221104/vua-mao-hiem/index.m3u8',
              },
            ],
          },
        ],
      };

      const compact = toCompactDetailPayload(singleMovie);
      assert.equal(compact._v, 3);
      assert.equal(compact.episodes[0].server_data.length, 1);
      assert.equal(compact.episodes[0].server_data[0].slug, 'full');
      assert.equal(
        compact.episodes[0].server_data[0].link_m3u8,
        'https://vip.opstream16.com/20221104/vua-mao-hiem/index.m3u8'
      );
      assert.equal(
        compact.episodes[0].server_data[0].link_embed,
        'https://vip.opstream16.com/share/vua-mao-hiem-embed'
      );
    });

    it('1.2. Short TV series (<= 12 eps) preserves streaming links for instant playback', () => {
      const epData = Array.from({ length: 10 }, (_, i) => ({
        name: `${i + 1}`,
        slug: `tap-${i + 1}`,
        link_embed: `https://embed.domain.com/series/tap-${i + 1}`,
        link_m3u8: `https://stream.domain.com/series/tap-${i + 1}/index.m3u8`,
      }));

      const seriesData = {
        status: true,
        movie: { name: 'Short Series', slug: 'short-series' },
        episodes: [
          {
            server_name: 'Server #1',
            server_data: epData,
          },
        ],
      };

      const compact = toCompactDetailPayload(seriesData);
      assert.equal(compact.episodes[0].server_data.length, 10);
      for (const ep of compact.episodes[0].server_data) {
        assert.ok(ep.link_m3u8, `Episode ${ep.slug} must retain link_m3u8`);
        assert.ok(ep.link_embed, `Episode ${ep.slug} must retain link_embed`);
      }
    });

    it('1.3. Long series (1,000 eps) strips non-initial streaming links and achieves > 85% bandwidth reduction', () => {
      const epCount = 1000;
      const rawServerData = Array.from({ length: epCount }, (_, i) => ({
        name: `${i + 1}`,
        slug: `tap-${i + 1}`,
        filename: `Detective Conan Episode ${i + 1} 1080p Vietsub.mp4`,
        link_embed: `https://player.phimapi.com/share/detective-conan-tap-${i + 1}-embed-hash-9382103810`,
        link_m3u8: `https://vip.opstream16.com/hls/detective-conan/tap-${i + 1}/index-1080p.m3u8?token=abcdef1234567890`,
      }));

      const conanData = {
        status: true,
        msg: 'done',
        movie: {
          name: 'Thám Tử Lừng Danh Conan',
          slug: 'tham-tu-lung-danh-conan',
          content: 'Thám tử học sinh Kudo Shinichi bị teo nhỏ thành Conan...',
        },
        episodes: [
          {
            server_name: 'Vietsub PhimAPI #1',
            server_data: rawServerData,
          },
          {
            server_name: 'Thuyết Minh NguonC #2',
            server_data: rawServerData,
          },
        ],
      };

      const rawJson = JSON.stringify(conanData);
      const rawBytes = Buffer.byteLength(rawJson, 'utf8');

      // Compact payload without specific requested episode: preserves ep 0 and 1
      const compact = toCompactDetailPayload(conanData);
      const compactJson = JSON.stringify(compact);
      const compactBytes = Buffer.byteLength(compactJson, 'utf8');

      const reductionPercent = ((rawBytes - compactBytes) / rawBytes) * 100;
      assert.ok(
        reductionPercent > 85,
        `Expected >85% reduction, got ${reductionPercent.toFixed(1)}% (from ${rawBytes} to ${compactBytes} bytes)`
      );

      // Verify server 1 episodes
      const s1 = compact.episodes[0].server_data;
      assert.equal(s1.length, epCount);
      // Episode 1 (idx 0) has streaming links
      assert.ok(s1[0].link_m3u8);
      assert.ok(s1[0].link_embed);
      // Episode 2 (idx 1) has streaming links
      assert.ok(s1[1].link_m3u8);
      assert.ok(s1[1].link_embed);
      // Episode 50 (idx 49) does NOT have streaming links (only name and slug)
      assert.equal(s1[49].link_m3u8, undefined);
      assert.equal(s1[49].link_embed, undefined);
      assert.equal(s1[49].name, '50');
      assert.equal(s1[49].slug, 'tap-50');

      // Now request specific episode deep-link (e.g. tap-500)
      const compactWithDeepLink = toCompactDetailPayload(conanData, 'tap-500');
      const s1Deep = compactWithDeepLink.episodes[0].server_data;
      const targetEp = s1Deep.find((e) => e.slug === 'tap-500');
      assert.ok(targetEp, 'Episode tap-500 must exist');
      assert.ok(targetEp.link_m3u8, 'Requested deep-linked episode tap-500 must retain link_m3u8');
      assert.ok(targetEp.link_embed, 'Requested deep-linked episode tap-500 must retain link_embed');
    });

    it('1.4. unpackDetailPayload is backward compatible with legacy uncompact payloads', () => {
      // Legacy payload without _v
      const legacy = {
        status: true,
        movie: {
          name: 'Old Movie',
          slug: 'old-movie',
          episodes: [
            {
              server_name: 'Old Server',
              server_data: [{ name: 'Full', slug: 'full', link_m3u8: 'https://m3u8' }],
            },
          ],
        },
      };

      const unpackedLegacy = unpackDetailPayload(legacy);
      assert.equal(unpackedLegacy.movie.name, 'Old Movie');
      assert.equal(unpackedLegacy.episodes[0].server_name, 'Old Server');
      assert.equal(unpackedLegacy.episodes[0].server_data[0].link_m3u8, 'https://m3u8');

      // Compact payload with _v: 3
      const compact = {
        _v: 3,
        status: true,
        movie: { name: 'New Movie', slug: 'new-movie' },
        episodes: [
          {
            server_name: 'New Server',
            server_data: [{ name: 'Full', slug: 'full' }],
          },
        ],
      };

      const unpackedNew = unpackDetailPayload(compact);
      assert.equal(unpackedNew.movie.name, 'New Movie');
      assert.equal(unpackedNew.movie.episodes[0].server_name, 'New Server');
      assert.equal(unpackedNew.episodes[0].server_name, 'New Server');
    });
  });

  describe('2. Recommendations Payload Optimization', () => {
    function generateMockMovieCard(slug: string, title: string) {
      return {
        _id: `id_${slug}`,
        name: title,
        slug,
        origin_name: `Original ${title}`,
        content: `Detailed synposis for ${title} with full paragraph content that bloats cache...`,
        type: 'series',
        status: 'completed',
        thumb_url: `https://img.phimapi.com/${slug}-thumb.jpg`,
        poster_url: `https://img.phimapi.com/${slug}-poster.jpg`,
        is_copyright: false,
        sub_docquyen: false,
        chieurap: false,
        trailer_url: '',
        time: '45 phút/tập',
        episode_current: 'Tập 24',
        episode_total: '24 Tập',
        quality: 'HD',
        lang: 'Vietsub',
        notify: '',
        showtimes: '',
        year: 2024,
        view: 15400,
        actor: ['Actor A', 'Actor B'],
        director: ['Director X'],
        category: [{ id: '1', name: 'Hành Động', slug: 'hanh-dong' }],
        country: [{ id: '1', name: 'Hàn Quốc', slug: 'han-quoc' }],
        relevanceScore: 95.5,
        _hasExactTargetGenre: true,
        _hasActorMatch: false,
        _isTmdbRec: true,
        matchPercent: 98,
      };
    }

    it('2.1. Deduplicates movie cards across groups and reduces payload size > 70%', () => {
      // 15 unique movies shared across groups
      const movie1 = generateMockMovieCard('movie-1', 'Movie One');
      const movie2 = generateMockMovieCard('movie-2', 'Movie Two');
      const movie3 = generateMockMovieCard('movie-3', 'Movie Three');
      const movie4 = generateMockMovieCard('movie-4', 'Movie Four');
      const movie5 = generateMockMovieCard('movie-5', 'Movie Five');

      const recommendationsData = {
        success: true,
        currentMovieTitle: 'Source Movie',
        genreName: 'Hành Động',
        countryName: 'Hàn Quốc',
        actorName: 'Actor A',
        directorName: 'Director X',
        genreMovies: [movie1, movie2, movie3],
        countryMovies: [movie2, movie4, movie5],
        actorMovies: [movie1, movie5],
        directorMovies: [movie3, movie4],
        allMovies: [movie1, movie2, movie3, movie4, movie5],
      };

      const rawJson = JSON.stringify(recommendationsData);
      const rawBytes = Buffer.byteLength(rawJson, 'utf8');

      const packed = packRecommendationsPayload(recommendationsData);
      const packedJson = JSON.stringify(packed);
      const packedBytes = Buffer.byteLength(packedJson, 'utf8');

      // Unique pool count must be exactly 5
      assert.equal(packed.v, 13);
      assert.equal(packed.pool.length, 5);
      assert.deepEqual(packed.genreSlugs, ['movie-1', 'movie-2', 'movie-3']);
      assert.deepEqual(packed.countrySlugs, ['movie-2', 'movie-4', 'movie-5']);
      assert.deepEqual(packed.actorSlugs, ['movie-1', 'movie-5']);
      assert.deepEqual(packed.directorSlugs, ['movie-3', 'movie-4']);
      assert.deepEqual(packed.allSlugs, ['movie-1', 'movie-2', 'movie-3', 'movie-4', 'movie-5']);

      // Strips unnecessary algorithmic flags
      const firstCard = packed.pool[0] as unknown as Record<string, unknown>;
      assert.equal(firstCard.relevanceScore, undefined);
      assert.equal(firstCard._hasExactTargetGenre, undefined);
      assert.equal(firstCard._hasActorMatch, undefined);
      assert.equal(firstCard._isTmdbRec, undefined);
      assert.equal(firstCard.content, undefined);

      const reductionPercent = ((rawBytes - packedBytes) / rawBytes) * 100;
      assert.ok(
        reductionPercent > 70,
        `Expected >70% reduction, got ${reductionPercent.toFixed(1)}% (from ${rawBytes} to ${packedBytes} bytes)`
      );
    });

    it('2.2. unpackRecommendationsPayload faithfully reconstructs 100% of 5 groups with exact count and ordering', () => {
      const movieA = generateMockMovieCard('slug-a', 'Film Alpha');
      const movieB = generateMockMovieCard('slug-b', 'Film Beta');
      const movieC = generateMockMovieCard('slug-c', 'Film Gamma');

      const original = {
        success: true,
        currentMovieTitle: 'Center Movie',
        genreName: 'Võ Thuật',
        countryName: 'Trung Quốc',
        actorName: 'Chân Tử Đan',
        directorName: 'Diệp Vĩ Tín',
        genreMovies: [movieA, movieB],
        countryMovies: [movieB, movieC],
        actorMovies: [movieA],
        directorMovies: [movieB],
        allMovies: [movieA, movieB, movieC],
      };

      const packed = packRecommendationsPayload(original);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unpacked: any = unpackRecommendationsPayload(packed);

      assert.equal(unpacked.success, true);
      assert.equal(unpacked.genreMovies.length, 2);
      assert.equal(unpacked.genreMovies[0].slug, 'slug-a');
      assert.equal(unpacked.genreMovies[1].slug, 'slug-b');

      assert.equal(unpacked.countryMovies.length, 2);
      assert.equal(unpacked.countryMovies[0].slug, 'slug-b');
      assert.equal(unpacked.countryMovies[1].slug, 'slug-c');

      assert.equal(unpacked.actorMovies.length, 1);
      assert.equal(unpacked.actorMovies[0].slug, 'slug-a');

      assert.equal(unpacked.directorMovies.length, 1);
      assert.equal(unpacked.directorMovies[0].slug, 'slug-b');

      assert.equal(unpacked.allMovies.length, 3);
      assert.equal(unpacked.allMovies[0].slug, 'slug-a');
      assert.equal(unpacked.allMovies[1].slug, 'slug-b');
      assert.equal(unpacked.allMovies[2].slug, 'slug-c');

      // Verify card attributes needed by RecommendationTabs
      const card = unpacked.allMovies[0];
      assert.equal(card.name, 'Film Alpha');
      assert.equal(card.thumb_url, 'https://img.phimapi.com/slug-a-thumb.jpg');
      assert.equal(card.poster_url, 'https://img.phimapi.com/slug-a-poster.jpg');
      assert.equal(card.year, 2024);
      assert.equal(card.episode_current, 'Tập 24');
      assert.equal(card.quality, 'HD');
      assert.equal(card.matchPercent, 98);
    });

    it('2.3. unpackRecommendationsPayload handles legacy v12 format seamlessly', () => {
      const legacyPayload = {
        success: true,
        currentMovieTitle: 'Legacy Center',
        genreMovies: [{ slug: 'legacy-1', name: 'Legacy Film' }],
        allMovies: [{ slug: 'legacy-1', name: 'Legacy Film' }],
      };

      const result = unpackRecommendationsPayload(legacyPayload);
      assert.deepEqual(result, legacyPayload);
    });
  });
});
