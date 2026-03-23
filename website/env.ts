import {createEnv} from "@t3-oss/env-core";
import {z} from "zod";

export const env = createEnv({
    server: {},
    clientPrefix: "NEXT_PUBLIC_",
    client: {
        NEXT_PUBLIC_WEBSITE_TITLE: z.string().min(1).optional(),
        NEXT_PUBLIC_MASTER_SERVER_URL: z.string().default("https://master.example.com"),
    },
    runtimeEnv: {
        NEXT_PUBLIC_WEBSITE_TITLE: process.env.NEXT_PUBLIC_WEBSITE_TITLE,
        NEXT_PUBLIC_MASTER_SERVER_URL: process.env.NEXT_PUBLIC_MASTER_SERVER_URL,
    },
    emptyStringAsUndefined: true,
});
