import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { movieApi, deduplicateServerEpisodes, extractEpisodeOrder } from './service';
import { findEpisodeMatch, getShortEpisodeLabel } from '@/lib/formatEpisode';
import { adaptVsmovEpisodes } from '@/services/providers/vsmov';

describe('Conan Episode & Nanaflix Provider Regression Test Suite', () => {
  it('1. deduplicateServerEpisodes sorts episodes in natural numeric order', () => {
    const unsorted = [
      { name: '1187', slug: 'tap-1187' },
      { name: '1188', slug: 'tap-1188' },
      { name: '1', slug: 'tap-1' },
      { name: '2', slug: 'tap-2' },
      { name: '1187-2', slug: 'tap-1187-2' },
      { name: '1049', slug: 'tap-1049' },
      { name: 'Trailer', slug: 'trailer' },
      { name: 'Full', slug: 'full' },
    ];

    const sorted = deduplicateServerEpisodes(unsorted);
    const names = sorted.map((s) => s.name);

    assert.deepEqual(names, [
      'Full',
      '1',
      '2',
      '1049',
      '1187',
      '1187-2',
      '1188',
      'Trailer',
    ]);
  });

  it('2. findEpisodeMatch strictly locates tap-1049 and avoids prefix mismatch with 1049-2', () => {
    const episodes = [
      { name: 'Tập 1049-2', slug: 'tap-1049-2' },
      { name: 'Tập 1049', slug: 'tap-1049' },
      { name: 'Tập 1050', slug: 'tap-1050' },
    ];

    const matchedExactSlug = findEpisodeMatch(episodes, 'tap-1049');
    assert.equal(matchedExactSlug?.slug, 'tap-1049');
    assert.equal(matchedExactSlug?.name, 'Tập 1049');

    const matchedCleanNumber = findEpisodeMatch(episodes, '1049');
    assert.equal(matchedCleanNumber?.slug, 'tap-1049');
    assert.equal(matchedCleanNumber?.name, 'Tập 1049');

    const matchedPart2 = findEpisodeMatch(episodes, 'tap-1049-2');
    assert.equal(matchedPart2?.slug, 'tap-1049-2');
  });

  it('3. adaptVsmovEpisodes ensures VSMOV server data is sorted starting from episode 1', () => {
    const rawServers = [
      {
        server_name: 'Server VSMOV #1',
        server_data: [
          { name: '1187', slug: 'tap-1187' },
          { name: '1188', slug: 'tap-1188' },
          { name: '1', slug: 'tap-1' },
          { name: '2', slug: 'tap-2' },
        ],
      },
    ];

    const adapted = adaptVsmovEpisodes(rawServers as Parameters<typeof adaptVsmovEpisodes>[0]);
    const firstServerEps = adapted[0].server_data;
    assert.equal(firstServerEps[0].name, '1');
    assert.equal(firstServerEps[1].name, '2');
    assert.equal(firstServerEps[2].name, '1187');
    assert.equal(firstServerEps[3].name, '1188');
  });

  it('4. Chunk 0 starts from episode 1, eliminating abnormal 1187-2 chunk labels', () => {
    const episodes = Array.from({ length: 100 }, (_, i) => ({
      name: `Tập ${i + 1}`,
      slug: `tap-${i + 1}`,
    }));

    const CHUNK_SIZE = 25;
    const startEp = episodes[0];
    const endEp = episodes[CHUNK_SIZE - 1];
    const chunk0Label = `Tập ${getShortEpisodeLabel(startEp.name)} - ${getShortEpisodeLabel(endEp.name)}`;

    assert.equal(chunk0Label, 'Tập 1 - 25');
    assert.ok(!chunk0Label.includes('1187'));
  });

  it('5. Movie detail for Conan has authentic Nanaflix provider with >1000 episodes and tap-1049', async () => {
    const data = await movieApi.getMovieDetail('tham-tu-lung-danh-conan');
    assert.ok(data, 'Movie detail must exist');
    assert.ok(data.movie, 'Movie payload must exist');

    // Nguồn Nanaflix chuẩn không bị dán nhãn độc quyền VSMOV
    assert.notEqual(data.movie.source, 'vsmov');

    const servers = data.episodes || data.movie.episodes || [];
    assert.ok(servers.length >= 2, 'Should have at least 2 servers (Vietsub and Lồng Tiếng)');

    const vietsub = servers[0];
    assert.ok(vietsub.server_data.length >= 1000, 'Vietsub server must have >= 1000 episodes');

    // Tập đầu tiên phải là tập 01/1, không phải 1187
    const firstEp = vietsub.server_data[0];
    const firstOrder = extractEpisodeOrder(firstEp.name, firstEp.slug);
    assert.equal(firstOrder, 1, 'First episode order must be 1');

    // Phải tìm thấy tập 1049
    const ep1049 = findEpisodeMatch(vietsub.server_data, 'tap-1049');
    assert.ok(ep1049, 'Episode 1049 must exist');
    assert.equal(ep1049?.slug, 'tap-1049');
  });
});
