import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DetectedColumn, ImportJobStatus } from "@/lib/universal-import/types";

const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockFrom = vi.fn();

function resetChain() {
  mockLimit.mockReturnValue({ data: [], error: null });
  mockOrder.mockReturnValue({ limit: mockLimit, data: [], error: null });
  mockEq.mockImplementation(() => ({
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    order: mockOrder,
    eq: mockEq,
    error: null,
  }));
  mockSelect.mockImplementation(() => ({
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  }));
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockInsert.mockReturnValue({
    select: () => ({
      single: mockSingle,
    }),
  });
  mockFrom.mockReturnValue({
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  });
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}));

import {
  createImportJob,
  getImportJob,
  listImportJobs,
  saveColumnMapping,
  saveDetectedColumns,
  updateImportJobStatus,
} from "@/lib/universal-import/import-store";

const JOB_ROW = {
  id: "job-11111111-1111-1111-1111-111111111111",
  agency_id: "agency-22222222-2222-2222-2222-222222222222",
  created_by: "user-33333333-3333-3333-3333-333333333333",
  source_system: "realvia",
  source_version: null,
  file_name: "smoke-realvia.csv",
  file_size_bytes: 512,
  file_hash: null,
  status: "pending",
  total_rows: 0,
  imported_rows: 0,
  skipped_rows: 0,
  duplicate_rows: 0,
  error_rows: 0,
  detected_columns: null,
  column_mapping: null,
  mapping_source: "auto",
  error_log: null,
  fatal_error: null,
  started_at: "2026-06-08T12:00:00.000Z",
  mapping_at: null,
  preview_at: null,
  importing_at: null,
  completed_at: null,
  time_to_complete: null,
};

describe("import-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChain();
  });

  describe("createImportJob", () => {
    it("inserts a pending job and maps camelCase fields", async () => {
      mockSingle.mockResolvedValue({ data: JOB_ROW, error: null });

      const job = await createImportJob({
        agencyId: JOB_ROW.agency_id,
        createdBy: JOB_ROW.created_by!,
        sourceSystem: "realvia",
        fileName: JOB_ROW.file_name,
        fileSizeBytes: JOB_ROW.file_size_bytes!,
      });

      expect(mockFrom).toHaveBeenCalledWith("import_jobs");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          agency_id: JOB_ROW.agency_id,
          status: "pending",
          file_name: "smoke-realvia.csv",
        }),
      );
      expect(job.id).toBe(JOB_ROW.id);
      expect(job.agencyId).toBe(JOB_ROW.agency_id);
      expect(job.status).toBe("pending");
    });

    it("throws when insert fails", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: "RLS denied" } });

      await expect(
        createImportJob({
          agencyId: JOB_ROW.agency_id,
          createdBy: JOB_ROW.created_by!,
          sourceSystem: "realvia",
          fileName: "fail.csv",
          fileSizeBytes: 1,
        }),
      ).rejects.toThrow("RLS denied");
    });
  });

  describe("getImportJob", () => {
    it("returns null when job is missing", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const job = await getImportJob(JOB_ROW.id);

      expect(job).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith("import_jobs");
    });

    it("maps DB row to ImportJob", async () => {
      mockMaybeSingle.mockResolvedValue({ data: JOB_ROW, error: null });

      const job = await getImportJob(JOB_ROW.id);

      expect(job?.fileName).toBe("smoke-realvia.csv");
      expect(job?.sourceSystem).toBe("realvia");
    });
  });

  describe("updateImportJobStatus", () => {
    it("patches status and counters", async () => {
      mockEq.mockReturnValueOnce({ error: null });

      await updateImportJobStatus(JOB_ROW.id, "importing" as ImportJobStatus, {
        importedRows: 2,
        totalRows: 3,
      });

      expect(mockFrom).toHaveBeenCalledWith("import_jobs");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "importing",
          imported_rows: 2,
          total_rows: 3,
        }),
      );
    });
  });

  describe("saveDetectedColumns", () => {
    it("stores columns and moves job to mapping", async () => {
      const detected: DetectedColumn[] = [
        {
          originalHeader: "Meno",
          target: "contact_name",
          confidence: 0.95,
          source: "auto",
          sampleValues: ["Smoke"],
        },
      ];
      mockEq.mockReturnValueOnce({ error: null });

      await saveDetectedColumns(JOB_ROW.id, detected);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          detected_columns: detected,
          status: "mapping",
          mapping_at: expect.any(String),
        }),
      );
    });
  });

  describe("saveColumnMapping", () => {
    it("stores mapping and moves job to preview", async () => {
      const mapping = { Meno: "contact_name" as const, Telefon: "phone" as const };
      mockEq.mockReturnValueOnce({ error: null });

      await saveColumnMapping(JOB_ROW.id, mapping, "manual");

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          column_mapping: mapping,
          mapping_source: "manual",
          status: "preview",
          preview_at: expect.any(String),
        }),
      );
    });
  });

  describe("listImportJobs", () => {
    it("returns jobs ordered by started_at desc", async () => {
      mockOrder.mockReturnValueOnce({
        data: [JOB_ROW],
        error: null,
      });

      const jobs = await listImportJobs(JOB_ROW.agency_id);

      expect(mockFrom).toHaveBeenCalledWith("import_jobs");
      expect(jobs).toHaveLength(1);
      expect(jobs[0]?.fileName).toBe("smoke-realvia.csv");
    });
  });
});
