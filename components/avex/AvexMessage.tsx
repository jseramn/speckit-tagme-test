export type AvexMessageRole = "user" | "assistant";

export interface AvexMessageProps {
  role: AvexMessageRole;
  content: string;
  isStreaming?: boolean;
}

export function AvexMessage({
  role,
  content,
  isStreaming = false,
}: AvexMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={[
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
      ].join(" ")}
    >
      <div
        className={[
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "rounded-br-md bg-tagme-ink text-tagme-cream"
            : "rounded-bl-md border border-tagme-slate/10 bg-white text-tagme-ink shadow-sm",
        ].join(" ")}
      >
        {!isUser && (
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.15em] text-tagme-gold">
            AVEX
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">
          {content}
          {isStreaming && (
            <span
              className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-tagme-gold/70"
              aria-hidden
            />
          )}
        </p>
      </div>
    </div>
  );
}