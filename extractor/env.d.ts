declare global {
  namespace NodeJS {
    interface ProcessEnv {
      CLIENT_URL: string;
      CLIENT_PORT: string;
      SERVER_URL: string;
      SERVER_URL_LOCALHOST: string;
      SERVER_PORT: string;
      EXTRACTOR_URL_LOCALHOST: string;
      EXTRACTOR_PORT: string;
      USER_PASSWORD: string;
      PLAYWRIGHT_BROWSERS_PATH: string;
    }
  }
}

export {};
