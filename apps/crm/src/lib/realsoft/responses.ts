import { NextResponse } from "next/server";

type RealsoftAckBody = {
  code: number;
  message: string;
};

function ack(body: RealsoftAckBody, status = 200) {
  return NextResponse.json(body, { status });
}

export function realsoftSuccess(message = "OK") {
  return ack({ code: 0, message }, 200);
}

export function realsoftWrongLogin(message = "Wrong login") {
  return ack({ code: 10, message }, 200);
}

export function realsoftMissingItems(message = "Missing items") {
  return ack({ code: 12, message }, 200);
}

export function realsoftInternalError(message = "Internal server error") {
  return ack({ code: 99, message }, 500);
}

