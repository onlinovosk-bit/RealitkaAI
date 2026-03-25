// import fs from "fs";
import path from "path";

export type ErrorLogEntry = {
  timestamp: string;
  context: string;
  message: string;
  stack?: string;
  raw: string;
};

const ERROR_LOG_PATH = path.resolve(process.cwd(), "error-capture.log");


export function getErrorLogEntries(limit = 100): ErrorLogEntry[] {
  // Node.js fs usage is disabled for serverless/client build compatibility
  return [];
}
