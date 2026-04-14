"use client";

import { useEffect, useState } from "react";

interface EventMessage {
  type: string;
  at?: string;
  [key: string]: unknown;
}

/**
 * Hook pre Server-Sent Events.
 * Automaticky sa reconnectuje pri chybe.
 * @param url - SSE endpoint (napr. "/api/events/stream")
 */
export function useEventStream(url: string) {
  const [messages, setMessages] = useState<EventMessage[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let es: EventSource;
    let retryTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource(url);

      es.onopen = () => setConnected(true);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as EventMessage;
          if (data.type === "CONNECTED") return; // úvodná správa, neignoruj ale nepridávaj
          setMessages((prev) => [...prev.slice(-99), data]); // max 100 správ
        } catch {
          // ignoruj neplatné JSON
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        // Auto-reconnect po 3 sekundách
        retryTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      clearTimeout(retryTimeout);
      es?.close();
      setConnected(false);
    };
  }, [url]);

  return { messages, connected };
}
