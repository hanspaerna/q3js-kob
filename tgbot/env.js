import 'dotenv/config';
import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
    server: {
        TELEGRAM_API_TOKEN: z.string(),
        TELEGRAM_CHAT_ID: z.string(),
        Q3JS_SERVER_HOST: z.string(),
        Q3JS_SERVER_UDP_PORT: z.coerce.number().int().default(27960),
        Q3JS_WEBSITE_HOST: z.string(),
        RCON_PASSWORD: z.string(),
    },
    runtimeEnv: process.env,
});