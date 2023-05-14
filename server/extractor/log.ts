import { Logger } from "playwright-core";

const logger: Logger = {
  isEnabled: function (
    name: string,
    severity: "info" | "error" | "verbose" | "warning"
  ): boolean {
    return severity === "error";
  },

  log: function (
    name: string,
    severity: "info" | "error" | "verbose" | "warning",
    message: string | Error,
    args: Object[],
    hints: { color?: string | undefined }
  ): void {
    console.log("Log | ", severity, message, JSON.stringify(args));
  },
};

export { logger };
