import { SignInCard } from "@/components/ui/sign-in-card"

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center bg-[#0a0a0a]">

      {/* ── Background layers ── */}

      {/* Base dark red gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-950/40 via-[#0a0a0a] to-[#0a0a0a]" />

      {/* Purple accent — top center */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] rounded-b-full bg-purple-900/20 blur-[100px]" />

      {/* Red glow — top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60vw] h-[40vh] rounded-b-full bg-red-700/15 blur-[80px]" />

      {/* Purple glow — bottom */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[70vw] h-[40vh] rounded-t-full bg-purple-900/15 blur-[80px]" />

      {/* Ambient spots */}
      <div className="absolute left-1/4 top-1/3 w-72 h-72 bg-red-500/5 rounded-full blur-[80px] animate-pulse" />
      <div className="absolute right-1/4 bottom-1/3 w-72 h-72 bg-purple-500/5 rounded-full blur-[80px] animate-pulse delay-700" />

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-soft-light pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      {/* ── Card ── */}
      <div className="relative z-10 w-full flex items-center justify-center px-4">
        <SignInCard />
      </div>

      {/* ── Footer ── */}
      <p className="absolute bottom-5 text-center text-xs text-white/20 z-10 px-4">
        Dengan masuk, kamu setuju dengan{" "}
        <span className="text-white/30">syarat penggunaan</span> kami.
      </p>
    </div>
  )
}
