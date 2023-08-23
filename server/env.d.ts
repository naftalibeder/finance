declare global {
  namespace NodeJS {
    interface ProcessEnv {
      CLIENT_URL: string;
      CLIENT_PORT: string;
      SERVER_URL: string;
      SERVER_PORT: string;
      EXTRACTOR_URL_LOCALHOST: string;
      EXTRACTOR_PORT: string;
      BROWSER_EXECUTABLE: string;
      USER_PASSWORD: string;
    }
  }
}

export {};
