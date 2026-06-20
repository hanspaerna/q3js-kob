import TelegramBot from 'node-telegram-bot-api';
import WebSocket from 'ws';
import { env } from './env.js';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(env.TELEGRAM_API_TOKEN, { polling: true });

await bot.setMyCommands([
    { command: 'q3', description: 'Send a message to the Skeleton\'s Lair CPMA server' },
]);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let lastMessageSentByConsole = "";

function connectWebSocket() {
    const ws = new WebSocket(`wss://${env.Q3JS_SERVER_HOST}/chat`);

    ws.on('open', () => {
        console.log('Connected to chat WebSocket');
    });

    ws.on('message', async (data) => {
        try {
            const { text } = JSON.parse(data);
            console.log(text);

            // 1 second delay to get an updated transliterated lastMessageSentByConsole
            // It's a bit ugly that we rely on response from message send endpoint while we could just take "text" variable
            // but this way the transliteration logic is not duplicated and always handled by the API, not by this project
            await delay(1000);

            if (text && text !== lastMessageSentByConsole) {
                await bot.sendMessage(env.TELEGRAM_CHAT_ID, text);
                lastMessageSentByConsole = "";
            }
        } catch (err) {
            console.error('Failed to process WebSocket message:', err);
        }
    });

    ws.on('close', () => {
        console.warn('WebSocket closed, reconnecting in 5s...');
        setTimeout(connectWebSocket, 5000); // auto-reconnect
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        ws.terminate();
    });
}

connectWebSocket();

const me = await bot.getMe();

bot.on('message', async (msg) => {
    const text = msg.text;

    const isSayCommand = text?.startsWith('/q3 ');
    const isReplyToBot = msg.reply_to_message?.from?.id === me.id;

    if (!isSayCommand && !isReplyToBot) return;

    const fullName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ');
    const message = `${fullName}: ${isReplyToBot ? text : text.slice(4)}`; // add tg user's full name, strip "/say" prefix

    try {
        const response = await fetch(`https://${env.Q3JS_WEBSITE_HOST}/api/rcon/say`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.RCON_PASSWORD}`,
            },
            body: JSON.stringify({
                host: env.Q3JS_SERVER_HOST,
                message: message,
                port: env.Q3JS_SERVER_UDP_PORT,
            }),
        });

        const data = await response.json();
        lastMessageSentByConsole = data.transliteratedMessage;

        if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`);
        }
    } catch (err) {
        console.error('Failed to forward message:', err);
    }
});