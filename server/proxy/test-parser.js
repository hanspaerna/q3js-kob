/**
 * Test script for the log parser
 * Run with: node test-parser.js
 */

const LogParser = require('./logParser');

const parser = new LogParser();

// Sample log lines to test
const sampleLogs = [
    'InitGame: \\sv_allowDownload\\0\\g_maxGameClients\\0\\sv_maxclients\\16\\sv_floodProtect\\1\\mapname\\q3dm6\\gamename\\cpma',

    // CPMA-specific join/leave format
    'Sul-Matuul^7 has passed authorization.',
    'tester000^7 has passed authorization.',
    'Kill: 0 1 6: Sul-Matuul killed tester000 by MOD_ROCKET',
    'Kill: 1 0 10: tester000 killed Sul-Matuul by MOD_RAILGUN',
    'Kill: 0 1 7: Sul-Matuul killed tester000 by MOD_ROCKET_SPLASH 8 in arena 0',
    'broadcast: print "tester000^7 disconnected\\n"',
    'broadcast: print "Sul-Matuul^7 disconnected\\n"',

    // Standard Q3 format (fallback)
    'ClientConnect: 2',
    'ClientUserinfoChanged: 2 \\n\\Player3\\t\\0\\model\\sarge/default\\hmodel\\sarge/default\\g_redteam\\\\g_blueteam\\\\c1\\4\\c2\\5',
    'ClientBegin: 2',
    'ClientDisconnect: 2',
];

console.log('Testing Log Parser\n');
console.log('='.repeat(60));

sampleLogs.forEach((line, index) => {
    console.log(`\n[${index + 1}] Input: ${line}`);

    const mapName = parser.extractMapName(line);
    if (mapName) {
        console.log(`    → Map detected: ${mapName}`);
    }

    const event = parser.parseLine(line);
    if (event) {
        console.log(`    → Event: ${JSON.stringify(event, null, 2)}`);
    } else {
        console.log(`    → No event`);
    }
});

console.log('\n' + '='.repeat(60));
console.log('\nPlayer tracking state:', Array.from(parser.playerNames.entries()));
console.log('\nTest complete!\n');
