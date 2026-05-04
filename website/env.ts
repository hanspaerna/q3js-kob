import {createEnv} from "@t3-oss/env-core";
import {z} from "zod";

export const env = createEnv({
    server: {
          MASTER_SERVER_URL: z.string(),
          WEBSITE_TITLE: z.string().min(1).optional(),
          LOGOUT_URL: z.string().min(1).optional(),
    },
    clientPrefix: "NEXT_PUBLIC_",
    client: {},
    runtimeEnv: {
        MASTER_SERVER_URL: process.env.MASTER_SERVER_URL,
        WEBSITE_TITLE: process.env.WEBSITE_TITLE,
        LOGOUT_URL: process.env.LOGOUT_URL,
    },
    emptyStringAsUndefined: true,
});
