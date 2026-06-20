'use strict';

const NAME_WIDTH = 10;

function padStart(value, width) {
    const str = String(value);
    return str.length >= width ? str : ' '.repeat(width - str.length) + str;
}

function padEnd(value, width) {
    const str = String(value);
    if (str.length > width) return str.slice(0, width - 1) + '.';
    return str + ' '.repeat(width - str.length);
}

function formatDuration(seconds) {
    if (seconds == null) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

function formatSigned(n) {
    return (n >= 0 ? '+' : '') + n;
}

function overallAccuracy(weapons) {
    if (!weapons || weapons.length === 0) return null;
    let hits = 0;
    let shots = 0;
    for (const w of weapons) {
        hits += w.hits || 0;
        shots += w.shots || 0;
    }
    return shots > 0 ? Math.round((hits / shots) * 100) : null;
}

export function formatMatchTable(result) {
    const { match, playerStats } = result;
    const isTeam = match.isTeamGame;
    const lines = [];

    lines.push(`Match Result | ${match.map} | ${match.gameType} | ${formatDuration(match.duration)}`);
    lines.push('');

    if (isTeam && match.teams) {
        lines.push(match.teams.map((t) => `${t.name} ${t.score}`).join(' - '));
    }

    const sorted = [...playerStats].sort((a, b) =>
        isTeam ? b.net - a.net : b.score - a.score
    );

    const scoreLabel = isTeam ? 'Net' : 'Sco';
    lines.push(
        padStart('#', 2) + ' ' + padEnd('Name', NAME_WIDTH) + ' ' +
        padStart(scoreLabel, 4) + ' ' + padStart('K', 3) + ' ' + padStart('D', 3) + ' ' +
        padStart('+/-', 6) + ' ' + padStart('Acc', 4)
    );

    sorted.forEach((p, i) => {
        const score = isTeam ? p.net : p.score;
        const dmg = formatSigned(p.damageGiven - p.damageTaken);
        const acc = overallAccuracy(p.weapons);
        lines.push(
            padStart(i + 1, 2) + ' ' + padEnd(p.name, NAME_WIDTH) + ' ' +
            padStart(score, 4) + ' ' + padStart(p.kills, 3) + ' ' + padStart(p.deaths, 3) + ' ' +
            padStart(dmg, 6) + ' ' + padStart(acc === null ? '-' : acc + '%', 4)
        );
    });

    return lines.join('\n');
}