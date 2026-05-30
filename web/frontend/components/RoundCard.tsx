interface Props {
  round: number;
  total: number;
  advocate: string;
  devil: string;
  advocateStreaming?: boolean;
  devilStreaming?: boolean;
}

export function RoundCard({
  round,
  total,
  advocate,
  devil,
  advocateStreaming = false,
  devilStreaming = false,
}: Props) {
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#2a2a2a] bg-[#111] text-sm text-[#737373]">
        Round {round} of {total}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#2a2a2a]">
        {/* Advocate */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <span className="text-sm font-medium text-green-400">Advocate</span>
            {advocateStreaming && (
              <span className="ml-1 inline-flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-green-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 rounded-full bg-green-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-1 rounded-full bg-green-400 animate-bounce [animation-delay:300ms]" />
              </span>
            )}
          </div>
          <p className="text-sm text-[#e5e5e5] leading-relaxed whitespace-pre-wrap">
            {advocate}
            {advocateStreaming && <span className="inline-block w-0.5 h-4 bg-green-400 ml-0.5 animate-pulse" />}
          </p>
        </div>

        {/* Devil */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span className="text-sm font-medium text-red-400">Devil&apos;s Advocate</span>
            {devilStreaming && (
              <span className="ml-1 inline-flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-red-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 rounded-full bg-red-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-1 rounded-full bg-red-400 animate-bounce [animation-delay:300ms]" />
              </span>
            )}
          </div>
          <p className="text-sm text-[#e5e5e5] leading-relaxed whitespace-pre-wrap">
            {devil}
            {devilStreaming && <span className="inline-block w-0.5 h-4 bg-red-400 ml-0.5 animate-pulse" />}
          </p>
        </div>
      </div>
    </div>
  );
}
