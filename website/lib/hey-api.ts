import type {CreateClientConfig} from './client/client.gen';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: typeof window !== 'undefined'
    ? (window as any).__ENV__?.masterServerUrl
    : process.env.MASTER_SERVER_URL,
});