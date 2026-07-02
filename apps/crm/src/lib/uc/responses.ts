import { NextResponse } from "next/server";

type UcAckBody = {
  code: number;
  message: string | Record<string, string>;
  importId?: string;
  url?: string;
};

function ack(body: UcAckBody, status = 200) {
  return NextResponse.json(body, { status });
}

export function ucWrongLogin(message = "Wrong login data") {
  return ack({ code: 10, message }, 200);
}

export function ucMissingData(message: string | Record<string, string> = "Missing data") {
  return ack({ code: 11, message }, 200);
}

export function ucWrongData(message: string | Record<string, string> = "Wrong data") {
  return ack({ code: 12, message }, 200);
}

export function ucCustom(message: string) {
  return ack({ code: 13, message }, 200);
}

export function ucObjectAdded(importId?: string, url?: string) {
  return ack({ code: 1, message: "Object added", importId, url }, 200);
}

export function ucObjectEdited(importId?: string, url?: string) {
  return ack({ code: 2, message: "Object edited", importId, url }, 200);
}

export function ucObjectDeleted() {
  return ack({ code: 3, message: "Object deleted" }, 200);
}

export function ucAgentAdded(importId?: string) {
  return ack({ code: 1, message: "Agent added", importId }, 200);
}

export function ucAgentEdited(importId?: string) {
  return ack({ code: 2, message: "Agent edited", importId }, 200);
}

export function ucAgentDeleted() {
  return ack({ code: 3, message: "Agent deleted" }, 200);
}

export function ucNotFound(kind: "object" | "agent") {
  return ack(
    {
      code: 4,
      message: kind === "object" ? "Object not found" : "Agent not found",
    },
    200,
  );
}

export function ucInternalError(message = "Internal server error") {
  return ack({ code: 13, message }, 500);
}
