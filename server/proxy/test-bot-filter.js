/**
 * Test script for bot filtering
 * Run with: node test-bot-filter.js
 */

const EventBatcher = require('./eventBatcher');

// Mock master server URL
const MASTER_URL = 'http://localhost:8080';

console.log('Testing Bot Event Filtering\n');
console.log('='.repeat(60));

// Create event batcher with bot filtering enabled
const batcher = new EventBatcher(MASTER_URL, 5000, true);

// Test events
const testEvents = [
    {
        event: 'kill',
        killer: { clientNum: 0, name: 'Sul-Matuul' },
        victim: { clientNum: 1, name: 'Sarge' }
    },
    {
        event: 'kill',
        killer: { clientNum: 1, name: 'Sarge' },
        victim: { clientNum: 0, name: 'Sul-Matuul' }
    },
    {
        event: 'kill',
        killer: { clientNum: 2, name: 'PlayerName' },
        victim: { clientNum: 3, name: 'AnotherPlayer' }
    },
    {
        event: 'join',
        player: { clientNum: 4, name: 'Visor' }
    },
    {
        event: 'join',
        player: { clientNum: 5, name: 'HumanPlayer' }
    },
    {
        event: 'leave',
        player: { clientNum: 4, name: 'Doom' }
    },
    {
        event: 'kill',
        killer: { clientNum: 6, name: 'Xaero' },
        victim: { clientNum: 7, name: 'Keel' }
    }
];

console.log('\nAdding events to batcher:\n');

testEvents.forEach((event, index) => {
    console.log(`[${index + 1}] ${JSON.stringify(event)}`);
    batcher.addEvent(event);
});

console.log('\n' + '='.repeat(60));
console.log(`\nEvents queued: ${batcher.eventQueue.length}`);
console.log(`Events filtered: ${batcher.filteredCount}`);
console.log('\nQueued events:');
batcher.eventQueue.forEach((event, index) => {
    console.log(`  [${index + 1}] ${event.event}: ${event.killer?.name || event.player?.name} ${event.victim ? `→ ${event.victim.name}` : ''}`);
});

console.log('\n' + '='.repeat(60));
console.log('\nExpected results:');
console.log('  - Event 1: FILTERED (victim is Sarge, a bot)');
console.log('  - Event 2: FILTERED (killer is Sarge, a bot)');
console.log('  - Event 3: QUEUED (both players are human)');
console.log('  - Event 4: FILTERED (Visor is a bot)');
console.log('  - Event 5: QUEUED (HumanPlayer is not a bot)');
console.log('  - Event 6: FILTERED (Doom is a bot)');
console.log('  - Event 7: FILTERED (both Xaero and Keel are bots)');
console.log('\n✓ Test complete!\n');
