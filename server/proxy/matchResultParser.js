'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_STATS_ROOT = '/server/persist/stats';

/**
 * Parses Quake 3 CPMA match-stats XML files (one file per match) into a
 * plain, JSON-serializable object.
 *
 * Files are expected to live under a date-partitioned directory tree:
 *   <statsRoot>/YYYY/MM/DD/HH_MM_SS.xml
 */
class MatchResultParser {
    /**
     * @param {string} [statsRoot] - root directory containing the date-partitioned stat files
     * @param {object} [options]
     * @param {boolean} [options.cache=true] - reuse the last parsed result instead of
     *   re-reading/re-parsing the XML when the resolved file hasn't changed
     */
    constructor(statsRoot = DEFAULT_STATS_ROOT, options = {}) {
        this.statsRoot = statsRoot;
        this.cacheEnabled = options.cache !== false;
        this._cache = null; // { filePath, result }
    }

    /**
     * Parses the most recently written match stats file, or a specific file
     * if an explicit path is provided. If caching is enabled (default) and the
     * resolved file is unchanged since the last call (same file path),
     * the previously parsed result is returned without touching the file again.
     * @param {string} [filePath] - optional explicit path, bypasses auto-discovery
     * @returns {object} parsed match result
     */
    parse(filePath) {
        const target = filePath || this.findLatestFile();
        if (!target) {
            throw new Error(`No match stats files found under ${this.statsRoot}`);
        }

        if (this.cacheEnabled) {
            if (
                this._cache &&
                this._cache.filePath === target
            ) {
                return this._cloneResult(this._cache.result);
            }

            const xml = fs.readFileSync(target, 'utf8');
            const result = this._parseMatchXml(xml);
            this._cache = { filePath: target, result };

            return this._cloneResult(result);
        }

        const xml = fs.readFileSync(target, 'utf8');
        return this._parseMatchXml(xml);
    }

    /** Deep-clones a cached result so callers can't mutate the shared cache entry. */
    _cloneResult(result) {
        return structuredClone(result);
    }

    /**
     * Walks <statsRoot>/YYYY/MM/DD/*.xml and returns the path to the most
     * recent file, newest year/month/day/filename first.
     * @returns {string|null}
     */
    findLatestFile() {
        for (const year of this._sortedDirs(this.statsRoot)) {
            const yearDir = path.join(this.statsRoot, year);
            for (const month of this._sortedDirs(yearDir)) {
                const monthDir = path.join(yearDir, month);
                for (const day of this._sortedDirs(monthDir)) {
                    const dayDir = path.join(monthDir, day);
                    const files = this._sortedFiles(dayDir);
                    if (files.length > 0) {
                        return path.join(dayDir, files[0]);
                    }
                }
            }
        }
        return null;
    }

    _sortedDirs(dir) {
        if (!fs.existsSync(dir)) return [];
        return fs.readdirSync(dir, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            // names are zero-padded (YYYY, MM, DD) so lexicographic order == numeric order
            .sort((a, b) => b.localeCompare(a));
    }

    _sortedFiles(dir) {
        if (!fs.existsSync(dir)) return [];
        return fs.readdirSync(dir, { withFileTypes: true })
            .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.xml'))
            .map((entry) => entry.name)
            .sort((a, b) => b.localeCompare(a));
    }

    _parseMatchXml(xml) {
        const matchBlock = this._extractBlocks(xml, 'match')[0];
        if (!matchBlock) {
            throw new Error('No <match> element found in stats file');
        }

        const attrs = matchBlock.attrs;
        const isTeamGame = attrs.isTeamGame === 'true';

        const result = {
            id: this._toNumber(attrs.id),
            match: {
                datetime: attrs.datetime,
                map: attrs.map,
                gameType: attrs.type,
                isTeamGame,
                duration: this._toNumber(attrs.duration),
            },
            playerStats: [],
        };

        if (isTeamGame) {
            const teams = this._extractBlocks(matchBlock.inner, 'team');
            result.match.teams = teams.map((t) => ({
                name: t.attrs.name,
                score: this._toNumber(t.attrs.score),
            }));

            for (const team of teams) {
                for (const p of this._extractBlocks(team.inner, 'player')) {
                    result.playerStats.push(this._parsePlayer(p, team.attrs.name));
                }
            }
        } else {
            for (const p of this._extractBlocks(matchBlock.inner, 'player')) {
                result.playerStats.push(this._parsePlayer(p, null));
            }
        }

        return result;
    }

    _parsePlayer(playerBlock, teamName) {
        const inner = playerBlock.inner;

        const weaponsBlock = this._extractBlocks(inner, 'weapons')[0];
        const itemsBlock = this._extractBlocks(inner, 'items')[0];
        const powerupsBlock = this._extractBlocks(inner, 'powerups')[0];
        const ctfBlock = this._extractBlocks(inner, 'CTF')[0];

        // Remove the sub-sections first so the generic <stat> scan below only
        // picks up the player's top-level stats (CTF has its own <stat> tags).
        let topLevel = inner;

        for (const block of [weaponsBlock, itemsBlock, powerupsBlock, ctfBlock]) {
            if (block) topLevel = topLevel.replace(block.full, '');
        }

        const stats = this._statsToMap(topLevel);

        const weapons = weaponsBlock
            ? this._extractSelfClosing(weaponsBlock.inner, 'weapon').map((w) => {
                const hits = this._toNumber(w.hits) || 0;
                const shots = this._toNumber(w.shots) || 0;
                return {
                    name: w.name,
                    kills: this._toNumber(w.kills) || 0,
                    hits,
                    shots,
                    accuracy: shots > 0 ? Math.round((hits / shots) * 10000) / 100 : 0,
                };
            })
            : [];

        const itemPickups = itemsBlock
            ? this._extractSelfClosing(itemsBlock.inner, 'item').map((i) => ({
                name: i.name,
                pickups: this._toNumber(i.pickups) || 0,
            }))
            : [];

        const powerups = powerupsBlock
            ? this._extractSelfClosing(powerupsBlock.inner, 'item').map((p) => ({
                name: p.name,
                pickups: this._toNumber(p.pickups) || 0,
                timeMs: this._toNumber(p.time) || 0,
            }))
            : [];

        const player = {
            name: playerBlock.attrs.name,
            score: stats.Score,
            kills: stats.Kills,
            deaths: stats.Deaths,
            suicides: stats.Suicides,
            net: stats.Net,
            damageGiven: stats.DamageGiven,
            damageTaken: stats.DamageTaken,
            healthTotal: stats.HealthTotal,
            armorTotal: stats.ArmorTotal,
            weapons,
            itemPickups,
            powerups,
        };

        if (teamName) player.team = teamName;
        if (stats.TeamKills !== undefined) player.teamKills = stats.TeamKills;
        if (stats.TeamDamage !== undefined) player.teamDamage = stats.TeamDamage;

        if (ctfBlock) {
            player.flagStats = this._extractSelfClosing(ctfBlock.inner, 'stat')
                .reduce((acc, s) => {
                    acc[s.name] = this._toNumber(s.value);
                    return acc;
                }, {});
        }

        return player;
    }

    _statsToMap(xmlFragment) {
        const map = {};

        for (const s of this._extractSelfClosing(xmlFragment, 'stat')) {
            map[s.name] = this._toNumber(s.value);
        }

        return map;
    }

    /** Extracts paired tags like <tag attr="x">inner</tag> (non-nested, same tag name). */
    _extractBlocks(xml, tagName) {
        const regex = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'g');
        const blocks = [];
        let m;

        while ((m = regex.exec(xml)) !== null) {
            blocks.push({
                attrs: this._parseAttributes(m[1]),
                inner: m[2],
                full: m[0],
            });
        }

        return blocks;
    }

    /** Extracts self-closing tags like <tag a="1" b="2"/>. */
    _extractSelfClosing(xml, tagName) {
        const regex = new RegExp(`<${tagName}\\b([^>]*)\\/>`, 'g');
        const tags = [];
        let m;

        while ((m = regex.exec(xml)) !== null) {
            tags.push(this._parseAttributes(m[1]));
        }

        return tags;
    }

    _parseAttributes(attrString) {
        const attrs = {};
        const regex = /([\w-]+)\s*=\s*"([^"]*)"/g;
        let m;

        while ((m = regex.exec(attrString)) !== null) {
            attrs[m[1]] = m[2];
        }

        return attrs;
    }

    _toNumber(value) {
        if (value === undefined || value === null || value === '') return undefined;
        const n = Number(value);

        return Number.isNaN(n) ? value : n;
    }
}

module.exports = MatchResultParser;