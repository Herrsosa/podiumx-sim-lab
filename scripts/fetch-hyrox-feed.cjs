#!/usr/bin/env node
/**
 * Pull upcoming HYROX races and completed race results from the official results site.
 *
 * Usage:
 *   node scripts/fetch-hyrox-feed.cjs
 *   node scripts/fetch-hyrox-feed.cjs --limit-completed 12 --out artifacts/hyrox-feed.json
 *   node scripts/fetch-hyrox-feed.cjs --write-results-dir artifacts/hyrox-results
 */

require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_BASE_URL = "https://results.hyrox.com/season-8/";

function parseArgs(argv) {
  const args = {
    limitCompleted: 12,
    out: "artifacts/hyrox-feed.json",
    writeResultsDir: null,
    baseUrl: process.env.HYROX_RESULTS_BASE_URL || DEFAULT_BASE_URL,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];

    if (token === "--limit-completed" && next) {
      args.limitCompleted = Number(next);
      i += 1;
      continue;
    }

    if (token === "--out" && next) {
      args.out = next;
      i += 1;
      continue;
    }

    if (token === "--write-results-dir" && next) {
      args.writeResultsDir = next;
      i += 1;
      continue;
    }

    if (token === "--base-url" && next) {
      args.baseUrl = next;
      i += 1;
    }
  }

  if (!Number.isFinite(args.limitCompleted) || args.limitCompleted < 1) {
    throw new Error("--limit-completed must be a positive number");
  }

  return args;
}

function buildUrl(baseUrl, pathname = "index.php", searchParams = {}) {
  const url = new URL(pathname, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}

function decodeHtml(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAthleteName(name) {
  const decoded = decodeHtml(name);
  if (!decoded.includes(",")) {
    return decoded;
  }

  const [lastName, ...firstNameParts] = decoded.split(",");
  const firstName = firstNameParts.join(",").trim();
  if (!firstName) {
    return decoded;
  }

  return `${firstName} ${lastName.trim()}`.replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseGroupLabel(groupLabel) {
  const cleaned = decodeHtml(groupLabel);
  const match = cleaned.match(/^(\d{4})\s+(.+)$/);
  if (!match) {
    return {
      label: cleaned,
      year: null,
      city: cleaned,
      eventSlug: slugify(cleaned),
    };
  }

  const year = Number(match[1]);
  const city = match[2].trim();
  return {
    label: cleaned,
    year,
    city,
    eventSlug: `${slugify(city)}-${year}`,
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Athlyst-Hyrox-Sync/1.0",
      accept: "application/json,text/plain,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed ${response.status} ${response.statusText} for ${url}`);
  }

  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Athlyst-Hyrox-Sync/1.0",
      accept: "text/html,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed ${response.status} ${response.statusText} for ${url}`);
  }

  return response.text();
}

async function getSearchFields(baseUrl, pid, branch, filters = {}) {
  const query = {
    content: "ajax2",
    func: "getSearchFields",
    "options[lang]": "EN_CAP",
    "options[pid]": pid,
  };

  for (const [field, value] of Object.entries(filters)) {
    query[`options[b][${branch}][${field}]`] = value;
  }

  const url = buildUrl(baseUrl, "index.php", query);
  const payload = await fetchJson(url);
  const branchData = payload?.branches?.[branch]?.fields;

  if (!branchData) {
    throw new Error(`Unexpected response for pid=${pid}, branch=${branch}`);
  }

  return branchData;
}

function readOptionPairs(fieldNode) {
  const list = fieldNode?.data;
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => {
      const value = item?.v?.[0];
      const label = item?.v?.[1];
      if (!value || !label) return null;
      return {
        value: decodeHtml(value),
        label: decodeHtml(label),
      };
    })
    .filter(Boolean);
}

function selectProEvent(eventOptions) {
  const normalized = eventOptions.filter((item) => {
    const label = item.label.toLowerCase();
    if (!label.startsWith("hyrox pro")) return false;
    if (label.includes("doubles")) return false;
    if (label.includes("adaptive")) return false;
    if (label.includes("team relay")) return false;
    return true;
  });

  if (normalized.length === 0) return null;

  const overall = normalized.find((item) => /overall/i.test(item.label));
  return overall || normalized[0];
}

function extractTopResults(html, limit = 3) {
  if (/There are currently no results available\./i.test(html)) {
    return [];
  }

  const results = [];
  const rowRegex = /type-place\s+place-primary\s+numeric"[^>]*>\s*(\d+)\s*<\/div>[\s\S]*?type-fullname"><a[^>]*>([^<]+)<\/a>[\s\S]*?right\s+list-field\s+type-time"[^>]*>[\s\S]*?<\/div>\s*([^<\n]+)\s*<\/div>/gi;

  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const place = Number(match[1]);
    const athleteName = normalizeAthleteName(match[2]);
    const totalTime = decodeHtml(match[3]);

    if (!Number.isFinite(place) || !athleteName || !totalTime) {
      continue;
    }

    results.push({
      athleteName,
      place,
      totalTime,
    });

    if (results.length >= limit) {
      break;
    }
  }

  return results;
}

async function getTopResultsForSex(baseUrl, eventMainGroup, eventCode, sex, limit = 3) {
  const url = buildUrl(baseUrl, "", {
    pid: "list",
    pidp: "ranking_nav",
    event_main_group: eventMainGroup,
    event: eventCode,
    ranking: "time_finish_netto",
    "search[sex]": sex,
    "search[age_class]": "%",
    "search[nation]": "%",
  });

  const html = await fetchText(url);
  return extractTopResults(html, limit);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const output = await fetchHyroxFeed({
    baseUrl: args.baseUrl,
    limitCompleted: args.limitCompleted,
    writeResultsDir: args.writeResultsDir,
  });

  writeJson(args.out, output);

  console.log(`Fetched ${output.upcoming.length} upcoming race group(s).`);
  console.log(`Fetched ${output.completed.length} completed race group(s) (limit ${args.limitCompleted}).`);
  console.log(`Wrote feed: ${args.out}`);

  if (args.writeResultsDir) {
    console.log(`Wrote division result files to: ${args.writeResultsDir}`);
  }
}

async function fetchHyroxFeed({ baseUrl = DEFAULT_BASE_URL, limitCompleted = 12, writeResultsDir = null }) {
  const upcomingFields = await getSearchFields(baseUrl, "startlist", "search");
  const upcomingGroups = readOptionPairs(upcomingFields.event_main_group).map((item) => item.value);
  const upcomingSet = new Set(upcomingGroups);

  const startFields = await getSearchFields(baseUrl, "start", "lists");
  const allResultGroups = readOptionPairs(startFields.event_main_group).map((item) => item.value);
  const completedGroups = allResultGroups
    .filter((group) => !upcomingSet.has(group))
    .slice(0, limitCompleted);

  const upcoming = [];
  for (const group of upcomingGroups) {
    const groupInfo = parseGroupLabel(group);
    const eventFields = await getSearchFields(baseUrl, "startlist", "search", {
      event_main_group: group,
    });

    const proEvent = selectProEvent(readOptionPairs(eventFields.event));
    upcoming.push({
      ...groupInfo,
      eventMainGroup: group,
      proEventCode: proEvent?.value || null,
      proEventLabel: proEvent?.label || null,
      startListUrl: buildUrl(baseUrl, "", {
        pid: "startlist_list",
        pidp: "ranking_nav",
      event_main_group: group,
      event: proEvent?.value || "",
    }).toString(),
  });
  }

  const completed = [];

  // Promote any "upcoming" race that already has published results into completed
  const upcomingWithResults = [];
  for (const race of upcoming) {
    if (!race.proEventCode) continue;

    const men = await getTopResultsForSex(baseUrl, race.eventMainGroup, race.proEventCode, "M");
    const women = await getTopResultsForSex(baseUrl, race.eventMainGroup, race.proEventCode, "W");

    const hasResults = (men?.length || 0) > 0 || (women?.length || 0) > 0;
    if (!hasResults) continue;

    upcomingWithResults.push(race.eventMainGroup);

    const record = {
      ...race,
      menProTop3: men,
      womenProTop3: women,
      resultsUrl: buildUrl(baseUrl, "", {
        pid: "list",
        pidp: "ranking_nav",
        event_main_group: race.eventMainGroup,
        event: race.proEventCode,
        ranking: "time_finish_netto",
      }).toString(),
      status: "promoted-from-upcoming",
    };

    completed.push(record);

    if (writeResultsDir) {
      const baseName = `${record.eventSlug}-pro`;
      if (men.length > 0) {
        writeJson(path.join(writeResultsDir, `${baseName}-men.json`), men);
      }
      if (women.length > 0) {
        writeJson(path.join(writeResultsDir, `${baseName}-women.json`), women);
      }
    }
  }

  const filteredUpcoming = upcoming.filter((race) => !upcomingWithResults.includes(race.eventMainGroup));
  for (const group of completedGroups) {
    const groupInfo = parseGroupLabel(group);
    const eventFields = await getSearchFields(baseUrl, "start", "lists", {
      event_main_group: group,
    });

    const proEvent = selectProEvent(readOptionPairs(eventFields.event));
    if (!proEvent) {
      completed.push({
        ...groupInfo,
        eventMainGroup: group,
        status: "no-pro-event-found",
      });
      continue;
    }

    const men = await getTopResultsForSex(baseUrl, group, proEvent.value, "M");
    const women = await getTopResultsForSex(baseUrl, group, proEvent.value, "W");

    const record = {
      ...groupInfo,
      eventMainGroup: group,
      proEventCode: proEvent.value,
      proEventLabel: proEvent.label,
      menProTop3: men,
      womenProTop3: women,
      resultsUrl: buildUrl(baseUrl, "", {
        pid: "list",
        pidp: "ranking_nav",
        event_main_group: group,
        event: proEvent.value,
        ranking: "time_finish_netto",
      }).toString(),
      status: men.length === 0 && women.length === 0 ? "no-results-yet" : "ok",
    };

    completed.push(record);

    if (writeResultsDir) {
      const baseName = `${record.eventSlug}-pro`;
      if (men.length > 0) {
        writeJson(path.join(writeResultsDir, `${baseName}-men.json`), men);
      }
      if (women.length > 0) {
        writeJson(path.join(writeResultsDir, `${baseName}-women.json`), women);
      }
    }
  }

  return {
    fetchedAt: new Date().toISOString(),
    source: baseUrl,
    upcoming: filteredUpcoming,
    completed,
  };
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error?.message || error);
    process.exit(1);
  });
}

module.exports = {
  fetchHyroxFeed,
  parseGroupLabel,
};
