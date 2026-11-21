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
