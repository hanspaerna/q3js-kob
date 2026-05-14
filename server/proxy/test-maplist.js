/**
 * Test script for maplist endpoint and gametype extraction
 * Run with: node test-maplist.js
 */

const LogParser = require('./logParser');

const parser = new LogParser();

// Mock InitGame line from actual server output
const mockInitGame = 'InitGame: \\sv_allowDownload\\1\\sv_dlrate\\0\\sv_hostname\\KOB-01 CPMA\\version\\ioq3 1.36 linux-x86_64 May 14 2026\\com_gamename\\Quake3Arena\\com_protocol\\71\\dmflags\\0\\fraglimit\\20\\timelimit\\0\\g_gametype\\0\\mapname\\crescent\\sv_privateClients\\0\\sv_maxclients\\8\\sv_minRate\\0\\sv_maxRate\\0\\sv_minPing\\0\\sv_maxPing\\0\\sv_floodProtect\\0\\sv_fps\\20\\game\\CPMA\\gamename\\cpma\\gamedate\\Oct 24 2023\\gameversion\\1.53\\sv_arenas\\1\\GTV_CN\\1\\g_maxGameClients\\0\\g_needpass\\0\\server_gameplay\\CPM';

// Test cases for different game types
const testCases = [
    { line: mockInitGame, expectedGameType: 0, expectedMap: 'crescent', description: 'FFA mode (0)' },
    { line: 'InitGame: \\g_gametype\\3\\mapname\\q3dm6', expectedGameType: 3, expectedMap: 'q3dm6', description: 'TDM mode (3)' },
    { line: 'InitGame: \\g_gametype\\4\\mapname\\q3ctf1', expectedGameType: 4, expectedMap: 'q3ctf1', description: 'CTF mode (4)' },
    { line: 'InitGame: \\g_gametype\\7\\mapname\\q3ctf2', expectedGameType: 7, expectedMap: 'q3ctf2', description: 'CTF mode (7)' },
    { line: 'Some random log line', expectedGameType: null, expectedMap: null, description: 'Non-InitGame line' },
];

// Game type to maplist file mapping
const GAMETYPE_MAPLIST_FILES = {
    0: '/cpma/cfg-maps/ffamaps.txt',
    3: '/cpma/cfg-maps/teammaps.txt',
    4: '/cpma/cfg-maps/ctfmaps.txt',
    7: '/cpma/cfg-maps/ctfmaps.txt',
};

console.log('Testing Maplist / GameType Extraction\n');
console.log('='.repeat(70));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
    console.log(`\n[${index + 1}] ${testCase.description}`);
    console.log(`    Input: ${testCase.line.substring(0, 60)}...`);

    const gameType = parser.extractGameType(testCase.line);
    const mapName = parser.extractMapName(testCase.line);

    const gameTypeOk = gameType === testCase.expectedGameType;
    const mapOk = mapName === testCase.expectedMap;

    if (gameTypeOk) {
        console.log(`    ✓ GameType: ${gameType}`);
        passed++;
    } else {
        console.log(`    ✗ GameType: ${gameType} (expected ${testCase.expectedGameType})`);
        failed++;
    }

    if (mapOk) {
        console.log(`    ✓ Map: ${mapName}`);
        passed++;
    } else {
        console.log(`    ✗ Map: ${mapName} (expected ${testCase.expectedMap})`);
        failed++;
    }

    if (gameType !== null) {
        const maplistFile = GAMETYPE_MAPLIST_FILES[gameType];
        if (maplistFile) {
            console.log(`    → Maplist file: ${maplistFile}`);
        } else {
            console.log(`    → No maplist configured for game type ${gameType}`);
        }
    }
});

console.log('\n' + '='.repeat(70));
console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
    console.log('\n❌ Some tests failed!\n');
    process.exit(1);
} else {
    console.log('\n✓ All tests passed!\n');
    process.exit(0);
}
