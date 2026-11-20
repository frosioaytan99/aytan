import React from 'react'

export default function AnimatedBackground() {
  return (
    <style jsx global>{`
      html, body, #__next { min-height: 100%; }
      body {
        position: relative;
        isolation: isolate;
        background-color: var(--paper, #faf9fc) !important;
        background-image:
          radial-gradient(ellipse at 12% 18%, rgba(130, 103, 235, .16), transparent 38%),
          radial-gradient(ellipse at 88% 24%, rgba(91, 190, 176, .12), transparent 36%),
          radial-gradient(ellipse at 72% 88%, rgba(239, 139, 184, .12), transparent 40%),
          radial-gradient(ellipse at 20% 82%, rgba(112, 87, 217, .09), transparent 36%) !important;
        background-attachment: fixed;
      }
      body::before,
      body::after {
        content: "";
        position: fixed;
        inset: -35%;
        z-index: -1;
        pointer-events: none;
        will-change: transform;
      }
      body::before {
        opacity: .72;
        filter: blur(48px) saturate(1.35);
        background:
          radial-gradient(ellipse 34% 22% at 18% 28%, rgba(121, 83, 255, .26), transparent 72%),
          radial-gradient(ellipse 38% 24% at 76% 30%, rgba(36, 211, 190, .20), transparent 72%),
          radial-gradient(ellipse 32% 26% at 62% 78%, rgba(255, 83, 174, .18), transparent 72%),
          radial-gradient(ellipse 28% 22% at 28% 76%, rgba(74, 130, 255, .18), transparent 72%);
        animation: weshbienAurora 30s ease-in-out infinite alternate;
      }
      body::after {
        inset: 0;
        opacity: .20;
        background-image:
          radial-gradient(circle, rgba(130, 103, 235, .65) 1px, transparent 1.8px),
          radial-gradient(circle, rgba(50, 190, 180, .55) 1px, transparent 1.8px);
        background-size: 86px 86px, 137px 137px;
        background-position: 0 0, 42px 65px;
        mask-image: linear-gradient(to bottom, transparent, black 18%, black 82%, transparent);
        animation: weshbienParticles 55s linear infinite;
      }
      #__next {
        position: relative;
        z-index: 1;
        background: transparent !important;
      }
      @keyframes weshbienAurora {
        0% { transform: translate3d(-3%, -2%, 0) rotate(-5deg) scale(1); }
        50% { transform: translate3d(3%, 2%, 0) rotate(4deg) scale(1.08); }
        100% { transform: translate3d(-1%, 4%, 0) rotate(-2deg) scale(1.04); }
      }
      @keyframes weshbienParticles {
        from { transform: translate3d(0, 0, 0); }
        to { transform: translate3d(-86px, -137px, 0); }
      }
      html[data-theme="dark"] body {
        background-color: #11101b !important;
        background-image:
          radial-gradient(ellipse at 12% 18%, rgba(130, 103, 235, .19), transparent 38%),
          radial-gradient(ellipse at 88% 24%, rgba(45, 190, 180, .14), transparent 36%),
          radial-gradient(ellipse at 72% 88%, rgba(221, 83, 165, .15), transparent 40%),
          radial-gradient(ellipse at 20% 82%, rgba(88, 104, 235, .16), transparent 36%) !important;
      }
      html[data-theme="dark"] body::before { opacity: .9; }
      html[data-theme="dark"] body::after { opacity: .25; }
      @media (prefers-reduced-motion: reduce) {
        body::before, body::after { animation: none !important; }
      }
    `}</style>
  )
}
