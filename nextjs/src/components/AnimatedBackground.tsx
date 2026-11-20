import React from 'react'

export default function AnimatedBackground() {
  return (
    <style jsx global>{`
      html, body, #__next { min-height: 100%; }
      body {
        background-color: var(--paper, #faf9fc) !important;
        background-image:
          radial-gradient(ellipse at 12% 18%, rgba(130, 103, 235, .17), transparent 36%),
          radial-gradient(ellipse at 88% 24%, rgba(91, 190, 176, .13), transparent 34%),
          radial-gradient(ellipse at 72% 88%, rgba(239, 139, 184, .13), transparent 38%),
          radial-gradient(ellipse at 20% 82%, rgba(112, 87, 217, .10), transparent 34%) !important;
        background-size: 150% 150%, 160% 160%, 150% 150%, 170% 170% !important;
        background-position: 0% 0%, 100% 0%, 100% 100%, 0% 100%;
        background-attachment: fixed;
        animation: weshbienAmbientDrift 26s ease-in-out infinite alternate;
      }
      #__next { background: transparent !important; }
      @keyframes weshbienAmbientDrift {
        0% { background-position: 0% 0%, 100% 0%, 100% 100%, 0% 100%; }
        50% { background-position: 35% 25%, 65% 40%, 70% 65%, 25% 75%; }
        100% { background-position: 70% 45%, 20% 80%, 10% 30%, 85% 15%; }
      }
      html[data-theme="dark"] body {
        background-color: #171522 !important;
        background-image:
          radial-gradient(ellipse at 12% 18%, rgba(130, 103, 235, .22), transparent 36%),
          radial-gradient(ellipse at 88% 24%, rgba(65, 163, 157, .13), transparent 34%),
          radial-gradient(ellipse at 72% 88%, rgba(190, 105, 153, .13), transparent 38%),
          radial-gradient(ellipse at 20% 82%, rgba(112, 87, 217, .15), transparent 34%) !important;
      }
      @media (prefers-reduced-motion: reduce) {
        body { animation: none !important; }
      }
    `}</style>
  )
}
