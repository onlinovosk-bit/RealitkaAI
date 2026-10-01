declare module "xlsx" {
  export type WorkSheet = unknown;
  export type WorkBook = { Sheets: Record<string, WorkSheet>; SheetNames: string[] };
  export function read(data: unknown, options?: Record<string, unknown>): WorkBook;
  export const utils: {
    sheet_to_json<T>(sheet: WorkSheet, options?: Record<string, unknown>): T[];
  };
}
