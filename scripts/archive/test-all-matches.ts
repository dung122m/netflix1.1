import { movieApi } from '../src/services/movies/service';
import { findEpisodeMatch } from '../src/lib/formatEpisode';

async function testAllEpisodes() {
  const data = await movieApi.getMovieDetail('tham-tu-lung-danh-conan');
  const servers = data?.episodes || [];

  console.log("Total servers:", servers.length);
  for (let sIdx = 0; sIdx < servers.length; sIdx++) {
    console.log(`Server ${sIdx}: ${servers[sIdx].server_name} (${servers[sIdx].server_data?.length} eps)`);
  }

  // Check matching from Server 2 (Lồng Tiếng #1) to Server 0 (Vietsub) and Server 1 (Lồng Tiếng)
  const srv2Eps = servers[2]?.server_data || [];
  const srv0Eps = servers[0]?.server_data || [];
  const srv1Eps = servers[1]?.server_data || [];

  let failSrv2To0 = 0;
  let failSrv2To1 = 0;

  for (let i = 0; i < srv2Eps.length; i++) {
    const ep = srv2Eps[i];
    const match0 = findEpisodeMatch(srv0Eps, ep.slug) || (ep.name ? findEpisodeMatch(srv0Eps, ep.name) : undefined);
    const match1 = findEpisodeMatch(srv1Eps, ep.slug) || (ep.name ? findEpisodeMatch(srv1Eps, ep.name) : undefined);

    if (!match0) {
      failSrv2To0++;
      if (failSrv2To0 <= 5) console.log(`Fail Srv2 -> Srv0 for [${ep.name}, ${ep.slug}]`);
    }
    if (!match1) {
      failSrv2To1++;
      if (failSrv2To1 <= 5) console.log(`Fail Srv2 -> Srv1 for [${ep.name}, ${ep.slug}]`);
    }
  }

  console.log(`Total fails Srv2 -> Srv0: ${failSrv2To0} / ${srv2Eps.length}`);
  console.log(`Total fails Srv2 -> Srv1: ${failSrv2To1} / ${srv2Eps.length}`);
}

testAllEpisodes().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

