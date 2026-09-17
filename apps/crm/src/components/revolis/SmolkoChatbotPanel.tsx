"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Bot, Loader2, Send, ShieldCheck, UserRound } from "lucide-react";

import {
  SMOLKO_CHAT_QUICK_PROMPTS,
  type SmolkoChatAnswer,
} from "@/lib/smolko-chatbot";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

type ChatMessage =
  | {
      id: string;
      role: "assistant";
      answer: SmolkoChatAnswer;
    }
  | {
      id: string;
      role: "user";
      text: string;
    }
  | {
      id: string;
      role: "assistant";
      text: string;
      error?: boolean;
    };

function introAnswer(): SmolkoChatAnswer {
  const now = new Date().toISOString();
  return {
    intent: "fallback",
    title: "Som pripravený nájsť dnešný ďalší krok",
    answer:
      "Opýtaj sa, komu volať, ktoré leady nesmieš stratiť alebo čo vybaviť ako prvé. Odpoviem iba z tvojich CRM dát.",
    bullets: [...SMOLKO_CHAT_QUICK_PROMPTS],
    cta: "Začni jednou z rýchlych otázok.",
    sources: [],
    generatedAt: now,
  };
}

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function SmolkoChatbotPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "intro", role: "assistant", answer: introAnswer() },
  ]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const canSubmit = question.trim().length >= 3 && !pending;
  const latestAnswer = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((message): message is Extract<ChatMessage, { answer: SmolkoChatAnswer }> =>
          message.role === "assistant" && "answer" in message,
        )?.answer,
    [messages],
  );

  async function ask(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (trimmed.length < 3 || pending) return;

    setPending(true);
    setQuestion("");
    setMessages((current) => [...current, { id: messageId(), role: "user", text: trimmed }]);

    try {
      const res = await fetch("/api/ai/smolko-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        answer?: SmolkoChatAnswer;
      };

      if (!res.ok || !payload.ok || !payload.answer) {
        throw new Error(payload.error || "Chat odpoveď sa nepodarilo načítať.");
      }

      setMessages((current) => [
        ...current,
        { id: messageId(), role: "assistant", answer: payload.answer },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: error instanceof Error ? error.message : "Chat odpoveď sa nepodarilo načítať.",
          error: true,
        },
      ]);
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <section
      className="rounded-3xl border p-5 md:p-6"
      style={{
        ...WORKDESK_CARD,
        borderColor: SLATE_HORIZON.softBorder,
      }}
      aria-labelledby="smolko-chatbot-title"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white"
              style={{ background: SLATE_HORIZON.brandDeep }}
              aria-hidden
            >
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: SLATE_HORIZON.brand }}>
                CRM asistent
              </p>
              <h2 id="smolko-chatbot-title" className="text-xl font-black" style={{ color: SLATE_HORIZON.ink }}>
                Komu volať a čo zachrániť dnes
              </h2>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: SLATE_HORIZON.muted }}>
            Pýtaj sa na priority v pipeline. Asistent používa iba tvoje tenant-scoped CRM dáta
            a pri nejasnej otázke radšej povie, čo nevie bezpečne vyhodnotiť.
          </p>
        </div>
        <div
          className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold"
          style={{ borderColor: SLATE_HORIZON.line, color: SLATE_HORIZON.greenDark, background: "#ECFDF5" }}
        >
          <ShieldCheck className="h-4 w-4" aria-hidden />
          Bez externého LLM
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {SMOLKO_CHAT_QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void ask(prompt)}
            disabled={pending}
            className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${SLATE_HORIZON.focusRing}`}
            style={{
              borderColor: SLATE_HORIZON.softBorder,
              background: SLATE_HORIZON.soft,
              color: SLATE_HORIZON.deep,
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="mt-5 max-h-[460px] space-y-4 overflow-y-auto rounded-2xl border bg-slate-50 p-3" style={{ borderColor: SLATE_HORIZON.line }}>
        {messages.map((message) => {
          if (message.role === "user") {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="flex max-w-[85%] items-start gap-2 rounded-2xl px-4 py-3 text-sm text-white" style={{ background: SLATE_HORIZON.brandDeep }}>
                  <UserRound className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
                  <p>{message.text}</p>
                </div>
              </div>
            );
          }

          if ("answer" in message) {
            return (
              <article key={message.id} className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: SLATE_HORIZON.line }}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-xl text-white" style={{ background: SLATE_HORIZON.brand }}>
                    <Bot className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold" style={{ color: SLATE_HORIZON.ink }}>{message.answer.title}</h3>
                    <p className="mt-1 text-sm leading-6" style={{ color: SLATE_HORIZON.deep }}>{message.answer.answer}</p>
                    {message.answer.bullets.length > 0 ? (
                      <ul className="mt-3 space-y-2 text-sm" style={{ color: SLATE_HORIZON.ink }}>
                        {message.answer.bullets.map((bullet) => (
                          <li key={bullet} className="rounded-xl border px-3 py-2" style={{ borderColor: SLATE_HORIZON.line, background: SLATE_HORIZON.bg }}>
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="mt-3 rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: "#FFF7ED", color: SLATE_HORIZON.amber }}>
                      Ďalší krok: {message.answer.cta}
                    </p>
                  </div>
                </div>
              </article>
            );
          }

          return (
            <div
              key={message.id}
              className="rounded-2xl border bg-white px-4 py-3 text-sm"
              style={{
                borderColor: message.error ? "#FECACA" : SLATE_HORIZON.line,
                color: message.error ? SLATE_HORIZON.danger : SLATE_HORIZON.deep,
              }}
              role={message.error ? "alert" : undefined}
            >
              {message.text}
            </div>
          );
        })}
        {pending ? (
          <div className="flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm" style={{ borderColor: SLATE_HORIZON.line, color: SLATE_HORIZON.muted }}>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Čítam CRM dáta...
          </div>
        ) : null}
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="smolko-chatbot-question" className="sr-only">
          Otázka pre CRM asistenta
        </label>
        <input
          ref={inputRef}
          id="smolko-chatbot-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={280}
          placeholder="Napr. Komu mám volať dnes?"
          className={`min-h-12 flex-1 rounded-2xl border bg-white px-4 text-sm outline-none ${SLATE_HORIZON.focusRing}`}
          style={{ borderColor: SLATE_HORIZON.softBorder, color: SLATE_HORIZON.ink }}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${SLATE_HORIZON.focusRing}`}
          style={{ background: SLATE_HORIZON.ctaGradient }}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          Opýtať sa
        </button>
      </form>

      {latestAnswer?.sources.length ? (
        <p className="mt-3 text-xs" style={{ color: SLATE_HORIZON.muted }}>
          Zdroj poslednej odpovede: {latestAnswer.sources.map((source) => `${source.label} (${source.count})`).join(", ")}.
        </p>
      ) : null}
    </section>
  );
}
