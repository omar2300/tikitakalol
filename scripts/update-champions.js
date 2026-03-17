/*
 * Champion data updater.
 *
 * Source order:
 * 1) CommunityDragon roster (official source of champion list)
 * 2) Wiki champion module lanes (client positions)
 * 3) LoLdle patch-note lane overrides
 * 4) Meraki lanes fallback
 *
 * Region order:
 * 1) Existing saved region
 * 2) Meraki faction mapping
 * 3) CDragon lore hint
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_FILE = join(__dirname, '..', 'championData.json');

const CDRAGON_SUMMARY_URL =
  'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-summary.json';
const CDRAGON_CHAMPION_URL =
  'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champions';
const LOL_WIKI_CHAMPION_DATA_URL =
  'https://wiki.leagueoflegends.com/en-us/Module:ChampionData/data?action=raw';
const LOLDLE_CLASSIC_URL = 'https://loldle.net/classic';
const LOLDLE_BASE_URL = 'https://loldle.net';

// Meraki Analytics: community-maintained, updated each patch, but can lag behind Riot releases
const MERAKI_URL = 'https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json';

// Meraki position values → game lane names
const POSITION_MAP = {
  TOP:     'Toplane',
  JUNGLE:  'Jungle',
  MIDDLE:  'Midlane',
  BOTTOM:  'Botlane',
  SUPPORT: 'Support',
};

// Meraki faction values → game region names
// Normalises by lowercasing and stripping spaces/dashes before lookup
const FACTION_MAP = {
  ionia:        'Ionia',
  demacia:      'Demacia',
  noxus:        'Noxus',
  freljord:     'Freljord',
  piltover:     'Piltover',
  zaun:         'Zaun',
  bilgewater:   'Bilgewater',
  shadowisles:  'ShadowIsles',   // covers "shadow-isles" and "shadow isles"
  shurima:      'Shurima',
  targon:       'Targon',
  mounttargon:  'Targon',
  ixtal:        'Ixtal',
  bandlecity:   'BandleCity',    // covers "bandle-city" and "bandle city"
  void:         'Void',
  // 'unaffiliated' and 'runeterra' map to Unknown (covers Darkin, Bard, Kindred, etc.)
};

// Special champions that should be derived from another champion's lanes/region.
const SPECIAL_CHAMPION_RULES = {
  Rhaast: {
    sourceChampion: 'Kayn',
    extraRegions: ['Darkin'],
  },
};

// In strict mode, existing champions only gain new lanes if Meraki also confirms them.
const STRICT_WIKI_ADDITIONS = true;

const CDRAGON_REGION_HINTS = [
  ['darkin', 'Darkin'],
  ['shadow isles', 'ShadowIsles'],
  ['shadow isles', 'ShadowIsles'],
  ['bandle city', 'BandleCity'],
  ['bilgewater', 'Bilgewater'],
  ['freljord', 'Freljord'],
  ['demacia', 'Demacia'],
  ['noxus', 'Noxus'],
  ['piltover', 'Piltover'],
  ['zaun', 'Zaun'],
  ['shurima', 'Shurima'],
  ['ixtal', 'Ixtal'],
  ['targon', 'Targon'],
  ['ionia', 'Ionia'],
  ['void', 'Void'],
];

async function fetchJson(url, timeoutMs = 20000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchText(url, timeoutMs = 20000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return res.text();
}

function normaliseFaction(faction) {
  return (faction ?? '').toLowerCase().replace(/[\s-]/g, '');
}

function merakiFactionToRegion(faction) {
  return FACTION_MAP[normaliseFaction(faction)] ?? 'Unknown';
}

function merakiPositionsToLanes(positions) {
  if (!positions || positions.length === 0) return [];
  return positions.map(p => POSITION_MAP[p]).filter(Boolean);
}

function wikiPositionToLane(position) {
  const map = {
    Top: 'Toplane',
    Jungle: 'Jungle',
    Middle: 'Midlane',
    Bottom: 'Botlane',
    Support: 'Support',
  };
  return map[position] ?? null;
}

function parseLuaArrayValues(line, fieldName) {
  const regex = new RegExp(`\\["${fieldName}"\\]\\s*=\\s*\\{([^}]*)\\}`);
  const match = line.match(regex);
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
}

function parseWikiChampionLaneMap(rawModule) {
  const byName = {};
  const lines = rawModule.split(/\r?\n/);
  let currentChampion = null;

  for (const line of lines) {
    const championStart = line.match(/^  \["(.+)"\]\s*=\s*\{$/);
    if (championStart) {
      currentChampion = championStart[1];
      if (!byName[currentChampion]) {
        byName[currentChampion] = { external: [], client: [] };
      }
      continue;
    }

    if (!currentChampion) continue;

    if (/^  \},$/.test(line)) {
      currentChampion = null;
      continue;
    }

    const external = parseLuaArrayValues(line, 'external_positions')
      .map(wikiPositionToLane)
      .filter(Boolean);
    if (external.length > 0) {
      byName[currentChampion].external = external;
    }

    const client = parseLuaArrayValues(line, 'client_positions')
      .map(wikiPositionToLane)
      .filter(Boolean);
    if (client.length > 0) {
      byName[currentChampion].client = client;
    }
  }

  return byName;
}

function inferRegionFromCDragon(detail) {
  const searchableText = [detail?.name, detail?.title, detail?.shortBio]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const [needle, region] of CDRAGON_REGION_HINTS) {
    if (searchableText.includes(needle)) {
      return region;
    }
  }

  return 'Unknown';
}

function dedupeEntries(entries) {
  const seen = new Set();
  const result = [];
  for (const entry of entries) {
    const key = `${entry.region}|${entry.lane}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(entry);
    }
  }
  return result;
}

function isReviewOnlyEntrySet(entries) {
  return Array.isArray(entries) && entries.length > 0 && entries.every(e => e.lane === 'REVIEW_NEEDED');
}

function parseDdMmYyyy(dateStr) {
  const [dd, mm, yyyy] = String(dateStr ?? '').split('/').map(Number);
  if (!dd || !mm || !yyyy) return 0;
  return new Date(yyyy, mm - 1, dd).getTime();
}

function extractBalancedObjectLiteral(text, startIndex) {
  let depth = 0;
  let inString = false;
  let escape = false;
  let quote = '';

  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === quote) {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (ch === '"' || ch === '\'' || ch === '`') {
      inString = true;
      quote = ch;
      continue;
    }

    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(startIndex, i + 1);
      }
    }
  }

  throw new Error('Could not find matching closing brace for LoLdle patch-notes object.');
}

async function fetchLoLdlePatchPositionOverrides() {
  const html = await fetchText(LOLDLE_CLASSIC_URL, 30000);
  const indexScriptMatch = html.match(/src=\"([^\"]*js\/index\.[^\"]*\.js)\"/i);
  if (!indexScriptMatch) {
    throw new Error('Could not find LoLdle index bundle URL.');
  }

  const bundleUrl = `${LOLDLE_BASE_URL}/${indexScriptMatch[1].replace(/^\//, '')}`;
  const bundle = await fetchText(bundleUrl, 45000);

  const marker = 'Pd=';
  const markerIndex = bundle.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error('Could not find LoLdle patch-notes object marker.');
  }

  const firstBrace = bundle.indexOf('{', markerIndex + marker.length);
  if (firstBrace < 0) {
    throw new Error('Could not find LoLdle patch-notes object start.');
  }

  const objectLiteral = extractBalancedObjectLiteral(bundle, firstBrace);
  const patchData = Function(`"use strict"; return (${objectLiteral});`)();
  const notes = Array.isArray(patchData?.notes) ? [...patchData.notes] : [];

  notes.sort((a, b) => parseDdMmYyyy(a.date) - parseDdMmYyyy(b.date));

  const overrides = {};
  const positionTokenToLane = {
    top: 'Toplane',
    jungle: 'Jungle',
    middle: 'Midlane',
    bottom: 'Botlane',
    support: 'Support',
  };

  for (const note of notes) {
    for (const entry of note.values ?? []) {
      const champItems = Array.isArray(entry.items?.[0]) ? entry.items[0] : [];
      const newValueItems = Array.isArray(entry.items?.[1]) ? entry.items[1] : [];

      const champions = champItems
        .filter(item => item?.isChampionName && typeof item.value === 'string')
        .map(item => item.value);

      if (champions.length === 0) continue;

      const lanes = newValueItems
        .map(item => item?.value)
        .filter(value => typeof value === 'string' && value.startsWith('positions.'))
        .map(value => value.split('.')[1])
        .map(token => positionTokenToLane[token])
        .filter(Boolean);

      if (lanes.length === 0) continue;

      const uniqueLanes = [...new Set(lanes)];
      for (const championName of champions) {
        overrides[championName] = { lanes: uniqueLanes };
      }
    }
  }

  return overrides;
}

function applySpecialChampionRules(updated, currentData) {
  const specialChanges = [];

  for (const [targetName, rule] of Object.entries(SPECIAL_CHAMPION_RULES)) {
    const sourceEntries = updated[rule.sourceChampion] ?? currentData[rule.sourceChampion] ?? [];
    if (sourceEntries.length === 0) continue;

    const sourceRegion = sourceEntries[0].region;
    const lanes = [...new Set(sourceEntries.map(e => e.lane))];
    const regions = [sourceRegion, ...(rule.extraRegions ?? [])];

    const nextEntries = dedupeEntries(
      lanes.flatMap(lane => regions.map(region => ({ region, lane })))
    );

    const prevEntries = currentData[targetName] ?? [];
    const prevKey = prevEntries.map(e => `${e.region}|${e.lane}`).sort().join(',');
    const nextKey = nextEntries.map(e => `${e.region}|${e.lane}`).sort().join(',');

    updated[targetName] = nextEntries;

    if (prevKey !== nextKey) {
      specialChanges.push({ targetName, sourceName: rule.sourceChampion, entries: nextEntries });
    }
  }

  return specialChanges;
}

function loadCurrentData() {
  try {
    const raw = readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.championData ?? parsed;
  } catch (err) {
    console.error('Could not read championData.json:', err.message);
    process.exit(1);
  }
}

function saveData(championData) {
  writeFileSync(DATA_FILE, JSON.stringify({ championData }, null, 2), 'utf8');
}

function assertWikiFallbackPersistence(sorted, wikiFallbackUsed) {
  for (const name of wikiFallbackUsed) {
    const entries = sorted[name];
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error(`Wiki fallback marked ${name} as updated, but no entries were saved.`);
    }

    const hasPlaceholder = entries.some(entry => entry.lane === 'REVIEW_NEEDED');
    if (hasPlaceholder) {
      throw new Error(
        `Wiki fallback marked ${name} as updated, but REVIEW_NEEDED remained in saved lanes.`
      );
    }
  }
}

async function main() {
  console.log('Fetching champion data from CommunityDragon, LoL Wiki, and Meraki…');
  const [officialSummary, merakiRaw, wikiRawModule] = await Promise.all([
    fetchJson(CDRAGON_SUMMARY_URL),
    fetchJson(MERAKI_URL),
    fetchText(LOL_WIKI_CHAMPION_DATA_URL, 45000),
  ]);
  const wikiLaneMap = parseWikiChampionLaneMap(wikiRawModule);

  // Meraki bulk endpoint is keyed by champion key ("Aatrox", "AurelionSol", …)
  // Each entry has a `name` field with the display name ("Aurelion Sol", etc.)
  const merakiByName = {};
  for (const champ of Object.values(merakiRaw)) {
    merakiByName[champ.name] = champ;
  }

  const officialByName = {};
  for (const champ of officialSummary) {
    if (champ.id === -1 || champ.name?.startsWith('Doom Bot')) continue;
    officialByName[champ.name] = champ;
  }

  const currentData = loadCurrentData();
  let loldleOverrides = {};
  let loldleOverrideCount = 0;

  if (process.env.LOLDLE_PATCH_NOTES !== '0') {
    try {
      loldleOverrides = await fetchLoLdlePatchPositionOverrides();
      loldleOverrideCount = Object.keys(loldleOverrides).length;
    } catch (err) {
      console.warn(`LoLdle patch-note scraping failed: ${err.message}`);
    }
  }

  // LoLdle patch-note position changes provide automatic lane overrides.
  const overrides = loldleOverrides;
  const existingNames  = new Set(Object.keys(currentData));
  const officialNames  = new Set(Object.keys(officialByName));

  const updated           = {};
  const added             = [];
  const removed           = [];
  const laneChanges       = [];
  const regionChanges     = [];
  const unknownFactions   = new Set();
  const specialChanges    = [];
  const merakiMissing     = [];
  const wikiPrimaryUsed   = [];
  const merakiFallbackUsed = [];
  const cdragonFallbackUsed = [];
  const skippedNoLanes    = [];
  const providerNoLanes   = [];
  const strictBlockedAdditions = [];
  const loldleOverridesApplied = new Set();

  // ── Process every champion in the official Riot-side roster ──────────────
  for (const [name, officialChampion] of Object.entries(officialByName)) {
    const merakiChampion = merakiByName[name];
    const merakiLanes = merakiChampion ? merakiPositionsToLanes(merakiChampion.positions) : [];
    const hasExisting = existingNames.has(name);
    const wikiPositions = wikiLaneMap[name] ?? { external: [], client: [] };
    // Prefer client_positions from wiki module because they align better with in-game role filters.
    const wikiLanes = wikiPositions.client;

    let lanes = [...wikiLanes];
    if (lanes.length > 0) wikiPrimaryUsed.push(name);

    // To avoid oscillating data when wiki availability fluctuates, Meraki lane fallback
    // is only used for new champions or existing REVIEW_NEEDED placeholders.
    const canUseMerakiLaneFallback =
      !hasExisting || isReviewOnlyEntrySet(currentData[name]);

    if (lanes.length === 0 && merakiChampion && canUseMerakiLaneFallback) {
      lanes = merakiLanes;
      if (lanes.length > 0) merakiFallbackUsed.push(name);
    }

    let region;
    if (currentData[name]?.length > 0) {
      region = currentData[name][0].region;
    } else if (merakiChampion) {
      region = merakiFactionToRegion(merakiChampion.faction);
      merakiFallbackUsed.push(name);
    } else {
      const detail = await fetchJson(`${CDRAGON_CHAMPION_URL}/${officialChampion.id}.json`);
      region = inferRegionFromCDragon(detail);
      cdragonFallbackUsed.push(name);
    }

    if (merakiChampion) {
      const normFaction = normaliseFaction(merakiChampion.faction);
      if (
        merakiChampion.faction &&
        !FACTION_MAP[normFaction] &&
        normFaction !== 'unaffiliated' &&
        normFaction !== 'runeterra'
      ) {
        unknownFactions.add(merakiChampion.faction);
      }
    } else {
      merakiMissing.push(name);
    }

    if (lanes.length === 0) {
      providerNoLanes.push(name);
      if (hasExisting) {
        updated[name] = currentData[name];
      } else {
        skippedNoLanes.push(name);
      }
      continue;
    }

    if (STRICT_WIKI_ADDITIONS && hasExisting) {
      const oldLaneSet = new Set(currentData[name].map(e => e.lane));
      const merakiLaneSet = new Set(merakiLanes);
      const keptOrRemoved = lanes.filter(lane => oldLaneSet.has(lane));
      const requestedAdds = lanes.filter(lane => !oldLaneSet.has(lane));
      const allowedAdds = requestedAdds.filter(lane => merakiLaneSet.has(lane));

      if (requestedAdds.length !== allowedAdds.length) {
        const blocked = requestedAdds.filter(lane => !merakiLaneSet.has(lane));
        strictBlockedAdditions.push({ name, blocked });
      }

      lanes = [...new Set([...keptOrRemoved, ...allowedAdds])];

      if (lanes.length === 0) {
        updated[name] = currentData[name];
        continue;
      }
    }

    const override = overrides[name];
    if (override && typeof override === 'object') {
      if (Array.isArray(override.lanes) && override.lanes.length > 0) {
        const parsedOverrideLanes = [...new Set(override.lanes.filter(Boolean))];
        if (parsedOverrideLanes.length > 0) {
          lanes = parsedOverrideLanes;
        }
      }
      if (typeof override.region === 'string' && override.region.trim()) {
        region = override.region.trim();
      }

      if (loldleOverrides[name]) {
        loldleOverridesApplied.add(name);
      }
    }

    const newEntries = lanes.map(lane => ({ region, lane }));

    if (!hasExisting) {
      const source = wikiLanes.length > 0 ? 'LoL Wiki' : 'Meraki fallback';
      added.push({ name, region, lanes, source });
    } else {
      const oldLanes = currentData[name].map(e => e.lane).sort().join(',');
      const newLanes = newEntries.map(e => e.lane).sort().join(',');
      if (oldLanes !== newLanes) {
        laneChanges.push({ name, old: oldLanes, new: newLanes });
      }

      const oldRegion = currentData[name][0]?.region ?? 'Unknown';
      if (oldRegion !== region) {
        regionChanges.push({ name, old: oldRegion, new: region });
      }
    }

    updated[name] = newEntries;
  }

  // Apply special-case champion derivations (e.g. Rhaast from Kayn).
  specialChanges.push(...applySpecialChampionRules(updated, currentData));

  // Detect removed champions. Keep them in file and report.
  const specialChampionNames = new Set(Object.keys(SPECIAL_CHAMPION_RULES));
  for (const name of existingNames) {
    if (!officialNames.has(name) && !specialChampionNames.has(name)) {
      removed.push(name);
      updated[name] = currentData[name]; // preserve as-is
    }
  }

  // Sort and save.
  const sorted = Object.fromEntries(
    Object.entries(updated).sort(([a], [b]) => a.localeCompare(b))
  );

  // Safety net: if wiki metadata was used, persisted output must contain concrete lanes.
  assertWikiFallbackPersistence(sorted, wikiPrimaryUsed);
  saveData(sorted);

  // Report.
  console.log('\nUpdate complete');
  console.log(`Champions: ${Object.keys(sorted).length}`);

  if (added.length) {
    console.log(`\nNew champions (${added.length}):`);
    added.forEach(({ name, region, lanes, source }) => {
      console.log(`  + ${name}: ${region} | ${lanes.join(', ') || 'REVIEW_NEEDED'} | ${source}`);
    });
  } else {
    console.log('\nNew champions: none');
  }

  if (laneChanges.length) {
    console.log(`\nLane changes (${laneChanges.length}):`);
    laneChanges.forEach(({ name, old: o, new: n }) => {
      console.log(`  ~ ${name}: [${o}] -> [${n}]`);
    });
  } else {
    console.log('\nLane changes: none');
  }

  if (regionChanges.length) {
    console.log(`\nRegion changes (${regionChanges.length}):`);
    regionChanges.forEach(({ name, old: o, new: n }) => {
      console.log(`  ~ ${name}: [${o}] -> [${n}]`);
    });
  } else {
    console.log('\nRegion changes: none');
  }

  if (specialChanges.length) {
    console.log(`\nSpecial-case updates (${specialChanges.length}):`);
    specialChanges.forEach(({ targetName, sourceName, entries }) => {
      const summary = entries.map(e => `${e.region}/${e.lane}`).join(', ');
      console.log(`  ~ ${targetName} (from ${sourceName}): [${summary}]`);
    });
  }

  if (merakiMissing.length) {
    console.log(`\nMeraki missing (${merakiMissing.length}):`);
    merakiMissing.forEach(name => console.log(`  ? ${name}`));
  }

  if (wikiPrimaryUsed.length) {
    console.log(`\nWiki lanes used: ${wikiPrimaryUsed.length}`);
  }

  if (merakiFallbackUsed.length) {
    console.log(`Meraki fallback used: ${new Set(merakiFallbackUsed).size}`);
  }

  if (cdragonFallbackUsed.length) {
    console.log(`CDragon region fallback used: ${cdragonFallbackUsed.length}`);
  }

  if (providerNoLanes.length) {
    console.log(`\nNo lane data (${providerNoLanes.length}), kept existing:`);
    providerNoLanes.forEach(name => console.log(`  ? ${name}`));
  }

  if (strictBlockedAdditions.length) {
    console.log(`\nStrict mode blocked additions (${strictBlockedAdditions.length}):`);
    strictBlockedAdditions.forEach(({ name, blocked }) => {
      console.log(`  ! ${name}: [${blocked.join(', ')}]`);
    });
  }

  if (loldleOverridesApplied.size) {
    console.log(`\nLoLdle overrides applied: ${loldleOverridesApplied.size}`);
  }

  if (loldleOverrideCount > 0) {
    console.log(`LoLdle patch-note entries loaded: ${loldleOverrideCount}`);
  }

  if (skippedNoLanes.length) {
    console.log(`\nSkipped new champions with no lanes (${skippedNoLanes.length}):`);
    skippedNoLanes.forEach(name => console.log(`  - ${name}`));
  }

  if (removed.length) {
    console.log(`\nChampions kept but missing from official roster (${removed.length}):`);
    removed.forEach(n => console.log(`  - ${n}`));
  }

  if (unknownFactions.size) {
    console.log(`\nUnknown Meraki factions (${unknownFactions.size}):`);
    [...unknownFactions].forEach(f => console.log(`  ? "${f}"`));
  }

  console.log('\nSource order: CDragon roster -> Wiki lanes -> LoLdle notes -> Meraki fallback');
  console.log('Strict mode: existing champions can only gain lanes confirmed by Meraki\n');
}

main().catch(err => {
  console.error('Update failed:', err);
  process.exit(1);
});
