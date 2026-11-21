import React, { useEffect } from 'react'

export default function AnimatedBackground() {
  useEffect(() => {
    const apply = () => {
      try {
        document.body.dataset.wallpaper = localStorage.getItem('weshbien-wallpaper') || 'aurora'
      } catch {
        document.body.dataset.wallpaper = 'aurora'
      }
    }
    apply()
    window.addEventListener('weshbien:wallpaper-change', apply)
    return () => window.removeEventListener('weshbien:wallpaper-change', apply)
  }, [])

  return (
    <style jsx global>{`
      html, body, #__next { min-height: 100%; }
      body {
        position: relative; isolation: isolate;
        background: var(--paper, #faf9fc) !important;
        background-attachment: fixed;
      }
      body::before, body::after {
        content: ""; position: fixed; inset: -35%; z-index: -1;
        pointer-events: none; will-change: transform;
      }
      body::before {
        opacity: .76; filter: blur(54px) saturate(1.4);
        background:
          radial-gradient(ellipse 34% 22% at 18% 28%, rgba(121,83,255,.34), transparent 72%),
          radial-gradient(ellipse 38% 24% at 76% 30%, rgba(36,211,190,.26), transparent 72%),
          radial-gradient(ellipse 32% 26% at 62% 78%, rgba(255,83,174,.23), transparent 72%),
          radial-gradient(ellipse 28% 22% at 28% 76%, rgba(74,130,255,.22), transparent 72%);
        animation: wbFloat 28s ease-in-out infinite alternate;
      }
      body::after {
        inset: 0; opacity: .18;
        background-image: radial-gradient(circle, rgba(130,103,235,.65) 1px, transparent 1.8px), radial-gradient(circle, rgba(50,190,180,.55) 1px, transparent 1.8px);
        background-size: 86px 86px, 137px 137px; background-position: 0 0, 42px 65px;
        mask-image: linear-gradient(to bottom, transparent, black 18%, black 82%, transparent);
        animation: wbParticles 55s linear infinite;
      }
      body[data-wallpaper="ocean"]::before {
        background: radial-gradient(ellipse at 20% 35%, #00b4d8aa, transparent 45%), radial-gradient(ellipse at 75% 65%, #005bea99, transparent 48%), linear-gradient(135deg,#041b3a,#075985,#082f49);
      }
      body[data-wallpaper="sunset"]::before {
        background: radial-gradient(ellipse at 30% 70%, #ffb36baa, transparent 45%), radial-gradient(ellipse at 75% 25%, #ff4d8daa, transparent 48%), linear-gradient(135deg,#31104a,#a83279,#f77f5b);
      }
      body[data-wallpaper="forest"]::before {
        background: radial-gradient(ellipse at 25% 25%, #8bc34aaa, transparent 45%), radial-gradient(ellipse at 75% 75%, #00a88499, transparent 48%), linear-gradient(135deg,#062b22,#14532d,#064e3b);
      }
      body[data-wallpaper="space"]::before {
        background: radial-gradient(ellipse at 25% 25%, #7c3aedbb, transparent 42%), radial-gradient(ellipse at 75% 70%, #2563ebaa, transparent 48%), linear-gradient(135deg,#08051f,#171044,#020617);
      }
      body[data-wallpaper="neon"]::before {
        background: radial-gradient(ellipse at 20% 30%, #ec4899bb, transparent 42%), radial-gradient(ellipse at 80% 65%, #06b6d4bb, transparent 48%), linear-gradient(135deg,#090018,#251044,#071a2d);
      }
      body[data-wallpaper="gold"]::before {
        background: radial-gradient(ellipse at 25% 25%, #fbbf24bb, transparent 42%), radial-gradient(ellipse at 75% 70%, #ea580c99, transparent 48%), linear-gradient(135deg,#241407,#713f12,#29200b);
      }
      body[data-wallpaper="ice"]::before {
        background: radial-gradient(ellipse at 20% 25%, #bae6fdaa, transparent 42%), radial-gradient(ellipse at 75% 70%, #60a5faaa, transparent 48%), linear-gradient(135deg,#0c2340,#164e63,#172554);
      }
      body[data-wallpaper="pink"]::before {
        background: radial-gradient(ellipse at 20% 25%, #f9a8d4bb, transparent 42%), radial-gradient(ellipse at 75% 70%, #c084fcaa, transparent 48%), linear-gradient(135deg,#3b123b,#831843,#4c1d95);
      }
      body[data-wallpaper="mountain"]::before {
        background: radial-gradient(ellipse at 22% 28%, #cbd5e1bb, transparent 43%), radial-gradient(ellipse at 78% 72%, #64748baa, transparent 48%), linear-gradient(135deg,#10243b,#64748b,#cbd5e1);
      }
      body[data-wallpaper="beach"]::before {
        background: radial-gradient(ellipse at 22% 28%, #facc15bb, transparent 43%), radial-gradient(ellipse at 78% 72%, #0e7490aa, transparent 48%), linear-gradient(135deg,#064e3b,#0e7490,#facc15);
      }
      body[data-wallpaper="waterfall"]::before {
        background: radial-gradient(ellipse at 22% 28%, #67e8f9bb, transparent 43%), radial-gradient(ellipse at 78% 72%, #0e7490aa, transparent 48%), linear-gradient(135deg,#082f49,#0e7490,#67e8f9);
      }
      body[data-wallpaper="desert"]::before {
        background: radial-gradient(ellipse at 22% 28%, #fde68abb, transparent 43%), radial-gradient(ellipse at 78% 72%, #d97706aa, transparent 48%), linear-gradient(135deg,#78350f,#d97706,#fde68a);
      }
      body[data-wallpaper="volcano"]::before {
        background: radial-gradient(ellipse at 22% 28%, #f97316bb, transparent 43%), radial-gradient(ellipse at 78% 72%, #b91c1caa, transparent 48%), linear-gradient(135deg,#1c1917,#b91c1c,#f97316);
      }
      body[data-wallpaper="jungle"]::before {
        background: radial-gradient(ellipse at 22% 28%, #a3e635bb, transparent 43%), radial-gradient(ellipse at 78% 72%, #15803daa, transparent 48%), linear-gradient(135deg,#052e16,#15803d,#a3e635);
      }
      body[data-wallpaper="lavender"]::before {
        background: radial-gradient(ellipse at 22% 28%, #e9d5ffbb, transparent 43%), radial-gradient(ellipse at 78% 72%, #8b5cf6aa, transparent 48%), linear-gradient(135deg,#312e81,#8b5cf6,#e9d5ff);
      }
      body[data-wallpaper="cherry"]::before {
        background: radial-gradient(ellipse at 22% 28%, #fbcfe8bb, transparent 43%), radial-gradient(ellipse at 78% 72%, #ec4899aa, transparent 48%), linear-gradient(135deg,#831843,#ec4899,#fbcfe8);
      }
      body[data-wallpaper="rain"]::before {
        background: radial-gradient(ellipse at 22% 28%, #38bdf8bb, transparent 43%), radial-gradient(ellipse at 78% 72%, #334155aa, transparent 48%), linear-gradient(135deg,#0f172a,#334155,#38bdf8);
      }
      body[data-wallpaper="storm"]::before {
        background: radial-gradient(ellipse at 22% 28%, #a78bfabb, transparent 43%), radial-gradient(ellipse at 78% 72%, #4c1d95aa, transparent 48%), linear-gradient(135deg,#111827,#4c1d95,#a78bfa);
      }
      body[data-wallpaper="fire"]::before {
        background: radial-gradient(ellipse at 22% 28%, #facc15bb, transparent 43%), radial-gradient(ellipse at 78% 72%, #c2410caa, transparent 48%), linear-gradient(135deg,#431407,#c2410c,#facc15);
      }
      body[data-wallpaper="smoke"]::before {
        background: radial-gradient(ellipse at 22% 28%, #db2777bb, transparent 43%), radial-gradient(ellipse at 78% 72%, #6d28d9aa, transparent 48%), linear-gradient(135deg,#18181b,#6d28d9,#db2777);
      }
      body[data-wallpaper="clouds"]::before {
        background: radial-gradient(ellipse at 22% 28%, #fbcfe8bb, transparent 43%), radial-gradient(ellipse at 78% 72%, #c4b5fdaa, transparent 48%), linear-gradient(135deg,#64748b,#c4b5fd,#fbcfe8);
      }
      body[data-wallpaper="dream"]::before {
        background: radial-gradient(ellipse at 22% 28%, #f0abfcbb, transparent 43%), radial-gradient(ellipse at 78% 72%, #0891b2aa, transparent 48%), linear-gradient(135deg,#312e81,#0891b2,#f0abfc);
      }
      body[data-wallpaper="minimal"]::before {
        background: radial-gradient(ellipse at 22% 28%, #52525bbb, transparent 43%), radial-gradient(ellipse at 78% 72%, #27272aaa, transparent 48%), linear-gradient(135deg,#09090b,#27272a,#52525b);
      }
      body[data-wallpaper="marble"]::before {
        background: radial-gradient(ellipse at 22% 28%, #c4b5fdbb, transparent 43%), radial-gradient(ellipse at 78% 72%, #6d5ba6aa, transparent 48%), linear-gradient(135deg,#18112b,#6d5ba6,#c4b5fd);
      }
      body[data-wallpaper="crystal"]::before {
        background: radial-gradient(ellipse at 22% 28%, #a5f3fcbb, transparent 43%), radial-gradient(ellipse at 78% 72%, #0e7490aa, transparent 48%), linear-gradient(135deg,#164e63,#0e7490,#a5f3fc);
      }
      body[data-wallpaper="copper"]::before {
        background: radial-gradient(ellipse at 22% 28%, #fdba74bb, transparent 43%), radial-gradient(ellipse at 78% 72%, #9a3412aa, transparent 48%), linear-gradient(135deg,#431407,#9a3412,#fdba74);
      }
      body[data-wallpaper="silver"]::before {
        background: radial-gradient(ellipse at 22% 28%, #e2e8f0bb, transparent 43%), radial-gradient(ellipse at 78% 72%, #64748baa, transparent 48%), linear-gradient(135deg,#1f2937,#64748b,#e2e8f0);
      }
      body[data-wallpaper="emerald"]::before {
        background: radial-gradient(ellipse at 22% 28%, #6ee7b7bb, transparent 43%), radial-gradient(ellipse at 78% 72%, #047857aa, transparent 48%), linear-gradient(135deg,#022c22,#047857,#6ee7b7);
      }
      body[data-wallpaper="ruby"]::before {
        background: radial-gradient(ellipse at 22% 28%, #fda4afbb, transparent 43%), radial-gradient(ellipse at 78% 72%, #be123caa, transparent 48%), linear-gradient(135deg,#450a0a,#be123c,#fda4af);
      }
      body[data-wallpaper="sapphire"]::before {
        background: radial-gradient(ellipse at 22% 28%, #93c5fdbb, transparent 43%), radial-gradient(ellipse at 78% 72%, #1d4ed8aa, transparent 48%), linear-gradient(135deg,#172554,#1d4ed8,#93c5fd);
      }
      body[data-wallpaper="cosmos"]::before {
        background: radial-gradient(ellipse at 22% 28%, #c084fcbb, transparent 43%), radial-gradient(ellipse at 78% 72%, #312e81aa, transparent 48%), linear-gradient(135deg,#020617,#312e81,#c084fc);
      }
      body[data-wallpaper="moon"]::before {
        background: radial-gradient(ellipse at 22% 28%, #e2e8f0bb, transparent 43%), radial-gradient(ellipse at 78% 72%, #475569aa, transparent 48%), linear-gradient(135deg,#0f172a,#475569,#e2e8f0);
      }
      body[data-wallpaper="stars"]::before {
        background: radial-gradient(ellipse at 22% 28%, #818cf8bb, transparent 43%), radial-gradient(ellipse at 78% 72%, #1e1b4baa, transparent 48%), linear-gradient(135deg,#020617,#1e1b4b,#818cf8);
      }
      body[data-wallpaper="matrix"]::before {
        background: radial-gradient(ellipse at 22% 28%, #4ade80bb, transparent 43%), radial-gradient(ellipse at 78% 72%, #15803daa, transparent 48%), linear-gradient(135deg,#052e16,#15803d,#4ade80);
      }
      body[data-wallpaper="cyber"]::before {
        background: radial-gradient(ellipse at 22% 28%, #22d3eebb, transparent 43%), radial-gradient(ellipse at 78% 72%, #be185daa, transparent 48%), linear-gradient(135deg,#2e1065,#be185d,#22d3ee);
      }
      body[data-wallpaper="laser"]::before {
        background: radial-gradient(ellipse at 22% 28%, #f0abfcbb, transparent 43%), radial-gradient(ellipse at 78% 72%, #7c3aedaa, transparent 48%), linear-gradient(135deg,#1e1b4b,#7c3aed,#f0abfc);
      }
      body[data-wallpaper="rainbow"]::before {
        background: radial-gradient(ellipse at 22% 28%, #facc15bb, transparent 43%), radial-gradient(ellipse at 78% 72%, #2563ebaa, transparent 48%), linear-gradient(135deg,#7f1d1d,#2563eb,#facc15);
      }
      body[data-wallpaper="electric"]::before {
        background: radial-gradient(ellipse at 22% 28%, #67e8f9bb, transparent 43%), radial-gradient(ellipse at 78% 72%, #1d4ed8aa, transparent 48%), linear-gradient(135deg,#172554,#1d4ed8,#67e8f9);
      }
      body[data-wallpaper="aurora"]::before { }
      #__next { position: relative; z-index: 1; background: transparent !important; }
      @keyframes wbFloat {
        0% { transform: translate3d(-3%,-2%,0) rotate(-5deg) scale(1); }
        50% { transform: translate3d(3%,2%,0) rotate(4deg) scale(1.08); }
        100% { transform: translate3d(-1%,4%,0) rotate(-2deg) scale(1.04); }
      }
      @keyframes wbParticles { from { transform: translate3d(0,0,0); } to { transform: translate3d(-86px,-137px,0); } }
      html[data-theme="dark"] body { background-color: #11101b !important; }
      html[data-theme="dark"] body::before { opacity: .9; }
      html[data-theme="dark"] body::after { opacity: .25; }
      @media (prefers-reduced-motion: reduce) { body::before, body::after { animation: none !important; } }
    `}</style>
  )
}
