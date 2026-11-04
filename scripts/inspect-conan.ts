import { movieApi } from '../src/services/movies/service';
import { findEpisodeMatch } from '../src/lib/formatEpisode';

async function main() {
  console.log('Fetching Conan movie detail...');
  const res = await movieApi.getMovieDetail('tham-tu-lung-danh-conan');
  if (!res?.movie?.episodes) {
    console.log('No episodes found');
    process.exit(1);
  }
  console.log('Total servers:', res.movie.episodes.length);
  for (let i = 0; i < res.movie.episodes.length; i++) {
    const s = res.movie.episodes[i];
    console.log(`\n=================== Server ${i}: ${s.server_name} ===================`);
    console.log(`Total episodes: ${s.server_data?.length}`);
    if (s.server_data && s.server_data.length > 0) {
      console.log('First ep:', s.server_data[0]);
      console.log('Second ep:', s.server_data[1]);
      console.log('Last ep:', s.server_data[s.server_data.length - 1]);
      
      // Let's test finding tap-1, tap-2, tap-67
      const ep1 = findEpisodeMatch(s.server_data, 'tap-1');
      const ep2 = findEpisodeMatch(s.server_data, 'tap-2');
      const ep67 = findEpisodeMatch(s.server_data, 'tap-67');
      const ep01 = findEpisodeMatch(s.server_data, 'tap-01');
      const ep02 = findEpisodeMatch(s.server_data, 'tap-02');
      const ep067 = findEpisodeMatch(s.server_data, 'tap-067');

      console.log('Match tap-1:', ep1?.name, ep1?.slug);
      console.log('Match tap-2:', ep2?.name, ep2?.slug);
      console.log('Match tap-67:', ep67?.name, ep67?.slug);
      console.log('Match tap-01:', ep01?.name, ep01?.slug);
      console.log('Match tap-02:', ep02?.name, ep02?.slug);
      console.log('Match tap-067:', ep067?.name, ep067?.slug);
    }
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
