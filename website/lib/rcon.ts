import dgram from 'dgram';

const RCON_PASSWORD = process.env.RCON_PASSWORD;

export function isRconConfigured(): boolean {
    return Boolean(RCON_PASSWORD);
}

export async function sendRconCommand(host: string, port: number, command: string): Promise<string> {
    if (!RCON_PASSWORD) {
        throw new Error('RCON not configured');
    }

    console.log(`[RCON] Sending to ${host}:${port} - command: ${command}`);

    return new Promise((resolve, reject) => {
        const client = dgram.createSocket('udp4');
        const timeout = setTimeout(() => {
            console.log(`[RCON] Timeout waiting for response from ${host}:${port}`);
            client.close();
            resolve('Command sent (no response)');
        }, 2000);

        const header = Buffer.from([0xff, 0xff, 0xff, 0xff]);
        const payload = Buffer.from(`rcon ${RCON_PASSWORD} ${command}`, 'utf8');
        const message = Buffer.concat([header, payload]);

        client.on('message', (msg) => {
            console.log(`[RCON] Response from ${host}:${port}: ${msg.toString().substring(0, 100)}`);
            clearTimeout(timeout);
            client.close();
            resolve(msg.toString());
        });

        client.on('error', (err) => {
            console.error(`[RCON] Error for ${host}:${port}:`, err);
            clearTimeout(timeout);
            client.close();
            reject(err);
        });

        client.send(message, port, host, (err) => {
            if (err) {
                console.error(`[RCON] Send error for ${host}:${port}:`, err);
                clearTimeout(timeout);
                client.close();
                reject(err);
            } else {
                console.log(`[RCON] Packet sent to ${host}:${port}`);
            }
        });
    });
}
