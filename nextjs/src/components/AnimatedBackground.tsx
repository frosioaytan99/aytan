import React, { useEffect, useState } from 'react'

const videoByTheme: Record<string, string> = {
  aurora: 'stars', ocean: 'ocean', sunset: 'sunset', forest: 'forest',
  space: 'stars', neon: 'stars', gold: 'sunset', ice: 'ocean', pink: 'sunset',
  mountain: 'sunset', beach: 'ocean', waterfall: 'forest', desert: 'sunset',
  volcano: 'sunset', jungle: 'forest', lavender: 'sunset', cherry: 'sunset',
  rain: 'ocean', storm: 'stars', fire: 'sunset', smoke: 'stars', clouds: 'sunset',
  dream: 'stars', minimal: 'stars', marble: 'stars', crystal: 'ocean',
  copper: 'sunset', silver: 'stars', emerald: 'forest', ruby: 'sunset',
  sapphire: 'ocean', cosmos: 'stars', moon: 'stars', stars: 'stars',
  matrix: 'matrix', cyber: 'stars', laser: 'stars', rainbow: 'sunset', electric: 'ocean',
}

const videoSources: Record<string, string> = {
  ocean: 'https://videos.pexels.com/video-files/33734611/14323344_3840_2160_60fps.mp4',
  forest: 'https://videos.pexels.com/video-files/31346766/13378120_3840_2160_60fps.mp4',
  sunset: 'https://videos.pexels.com/video-files/20583506/20583506-uhd_3840_2160_30fps.mp4',
  stars: 'https://videos.pexels.com/video-files/29628759/12749515_3840_2160_30fps.mp4',
}

export default function AnimatedBackground() {
  const [wallpaper, setWallpaper] = useState('aurora')
  const [videoEnabled, setVideoEnabled] = useState(false)

  useEffect(() => {
    const apply = () => {
      let next = 'aurora'
      try { next = localStorage.getItem('weshbien-wallpaper') || 'aurora' } catch {}
      let night = 'cosmos'
      try { night = localStorage.getItem('weshbien-dark-wallpaper') || 'cosmos' } catch {}
      const dark = document.documentElement.dataset.theme === 'dark'
      const activeWallpaper = dark ? night : next
      setWallpaper(activeWallpaper)
      document.body.dataset.wallpaper = activeWallpaper
      document.documentElement.dataset.wallpaper = activeWallpaper
    }
    apply()
    window.addEventListener('weshbien:wallpaper-change', apply)
    const observer = new MutationObserver(apply)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setVideoEnabled(!reduced)
    return () => { window.removeEventListener('weshbien:wallpaper-change', apply); observer.disconnect() }
  }, [])

  const videoGroup = videoByTheme[wallpaper] || 'stars'
  const videoSource = videoEnabled ? videoSources[videoGroup] : ''

  return (
    <>
      {wallpaper === 'matrix' && <div className="wb-matrix-rain" aria-hidden="true">
        {['010101110010101101001011010101','101101001010110101101001010110','001011010110010101101011001010','110010101101001011010110101101','010110100101101101001010110101','101001011010110010101101001011','011010110101001011010110100101','100101101001011010110101001011'].map((code, index) => <span key={index}>{code}</span>)}
      </div>}
      {videoSource && <video key={videoSource} className="wb-wallpaper-video" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
        <source src={videoSource} type="video/mp4" />
      </video>}
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
        body[data-wallpaper="ocean"]::before { background:radial-gradient(ellipse at 20% 35%,#00b4d8aa,transparent 45%),radial-gradient(ellipse at 75% 65%,#005bea99,transparent 48%),linear-gradient(135deg,#041b3a,#075985,#082f49); }
        body[data-wallpaper="sunset"]::before { background:radial-gradient(ellipse at 30% 70%,#ffb36baa,transparent 45%),radial-gradient(ellipse at 75% 25%,#ff4d8daa,transparent 48%),linear-gradient(135deg,#31104a,#a83279,#f77f5b); }
        body[data-wallpaper="forest"]::before { background:radial-gradient(ellipse at 25% 25%,#8bc34aaa,transparent 45%),radial-gradient(ellipse at 75% 75%,#00a88499,transparent 48%),linear-gradient(135deg,#062b22,#14532d,#064e3b); }
        body[data-wallpaper="space"]::before,body[data-wallpaper="cosmos"]::before,body[data-wallpaper="stars"]::before,body[data-wallpaper="moon"]::before { background:radial-gradient(ellipse at 25% 25%,#7c3aedbb,transparent 42%),radial-gradient(ellipse at 75% 70%,#2563ebaa,transparent 48%),linear-gradient(135deg,#08051f,#171044,#020617); }
        body[data-wallpaper="neon"]::before,body[data-wallpaper="cyber"]::before,body[data-wallpaper="laser"]::before { background:radial-gradient(ellipse at 20% 30%,#ec4899bb,transparent 42%),radial-gradient(ellipse at 80% 65%,#06b6d4bb,transparent 48%),linear-gradient(135deg,#090018,#251044,#071a2d); }
        body[data-wallpaper="gold"]::before,body[data-wallpaper="desert"]::before,body[data-wallpaper="copper"]::before { background:radial-gradient(ellipse at 25% 25%,#fbbf24bb,transparent 42%),radial-gradient(ellipse at 75% 70%,#ea580c99,transparent 48%),linear-gradient(135deg,#241407,#713f12,#29200b); }
        body[data-wallpaper="ice"]::before,body[data-wallpaper="crystal"]::before,body[data-wallpaper="sapphire"]::before,body[data-wallpaper="electric"]::before { background:radial-gradient(ellipse at 20% 25%,#bae6fdaa,transparent 42%),radial-gradient(ellipse at 75% 70%,#60a5faaa,transparent 48%),linear-gradient(135deg,#0c2340,#164e63,#172554); }
        body[data-wallpaper="pink"]::before,body[data-wallpaper="cherry"]::before,body[data-wallpaper="ruby"]::before { background:radial-gradient(ellipse at 20% 25%,#f9a8d4bb,transparent 42%),radial-gradient(ellipse at 75% 70%,#c084fcaa,transparent 48%),linear-gradient(135deg,#3b123b,#831843,#4c1d95); }
        body[data-wallpaper="mountain"]::before,body[data-wallpaper="silver"]::before,body[data-wallpaper="minimal"]::before { background:radial-gradient(ellipse at 22% 28%,#cbd5e1bb,transparent 43%),radial-gradient(ellipse at 78% 72%,#64748baa,transparent 48%),linear-gradient(135deg,#10243b,#64748b,#cbd5e1); }
        body[data-wallpaper="beach"]::before,body[data-wallpaper="waterfall"]::before { background:radial-gradient(ellipse at 22% 28%,#67e8f9bb,transparent 43%),radial-gradient(ellipse at 78% 72%,#0e7490aa,transparent 48%),linear-gradient(135deg,#082f49,#0e7490,#67e8f9); }
        body[data-wallpaper="volcano"]::before,body[data-wallpaper="fire"]::before { background:radial-gradient(ellipse at 22% 28%,#f97316bb,transparent 43%),radial-gradient(ellipse at 78% 72%,#b91c1caa,transparent 48%),linear-gradient(135deg,#1c1917,#b91c1c,#f97316); }
        body[data-wallpaper="jungle"]::before,body[data-wallpaper="emerald"]::before,body[data-wallpaper="matrix"]::before { background:radial-gradient(ellipse at 22% 28%,#a3e635bb,transparent 43%),radial-gradient(ellipse at 78% 72%,#15803daa,transparent 48%),linear-gradient(135deg,#052e16,#15803d,#a3e635); }
        body[data-wallpaper="lavender"]::before,body[data-wallpaper="dream"]::before,body[data-wallpaper="marble"]::before,body[data-wallpaper="smoke"]::before { background:radial-gradient(ellipse at 22% 28%,#e9d5ffbb,transparent 43%),radial-gradient(ellipse at 78% 72%,#8b5cf6aa,transparent 48%),linear-gradient(135deg,#312e81,#8b5cf6,#e9d5ff); }
        body[data-wallpaper="rain"]::before,body[data-wallpaper="storm"]::before,body[data-wallpaper="clouds"]::before { background:radial-gradient(ellipse at 22% 28%,#38bdf8bb,transparent 43%),radial-gradient(ellipse at 78% 72%,#334155aa,transparent 48%),linear-gradient(135deg,#0f172a,#334155,#38bdf8); }
        #__next { position: relative; z-index: 1; background: transparent !important; }
        body[data-wallpaper="matrix"]::before {
          opacity:.8!important;filter:blur(12px) saturate(1.3);
          background:radial-gradient(ellipse at 50% 40%,#064e3b88,transparent 65%),linear-gradient(180deg,#020b07,#031a0d 55%,#010805)!important;
        }
        body[data-wallpaper="matrix"]::after {
          opacity:.12!important;background-image:linear-gradient(90deg,transparent 49%,#22c55e 50%,transparent 51%);
          background-size:48px 100%;
        }
        .wb-matrix-rain {
          position:fixed;inset:0;z-index:-1;display:flex;justify-content:space-around;
          overflow:hidden;pointer-events:none;opacity:.32;color:#4ade80;
          text-shadow:0 0 8px #22c55e,0 0 18px #16a34a;
          mask-image:linear-gradient(to bottom,transparent,#000 12%,#000 88%,transparent);
        }
        .wb-matrix-rain span {
          writing-mode:vertical-rl;text-orientation:upright;white-space:nowrap;
          font:700 14px/1.8 monospace;letter-spacing:5px;
          animation:wbMatrixFall 9s linear infinite;
        }
        .wb-matrix-rain span:nth-child(2n){animation-duration:13s;animation-delay:-5s;opacity:.65}
        .wb-matrix-rain span:nth-child(3n){animation-duration:11s;animation-delay:-8s;opacity:.8}
        @keyframes wbMatrixFall {from{transform:translateY(-110%)}to{transform:translateY(110vh)}}
        html[data-theme="dark"] body[data-wallpaper="rain"]::before { background:radial-gradient(ellipse at 25% 25%,#38bdf8aa,transparent 42%),linear-gradient(135deg,#020617,#0f172a,#164e63)!important; }
        html[data-theme="dark"] body[data-wallpaper="volcano"]::before { background:radial-gradient(ellipse at 50% 75%,#f97316bb,transparent 38%),linear-gradient(135deg,#090909,#450a0a,#7f1d1d)!important; }
        html[data-theme="dark"] body[data-wallpaper="aurora"]::before { background:radial-gradient(ellipse at 20% 25%,#14b8a6bb,transparent 40%),radial-gradient(ellipse at 75% 70%,#7c3aedbb,transparent 45%),linear-gradient(135deg,#020617,#071b2c,#171044)!important; }
        html[data-theme="dark"] body[data-wallpaper="neon"]::before { background:radial-gradient(ellipse at 20% 25%,#a855f7bb,transparent 42%),radial-gradient(ellipse at 80% 70%,#db2777aa,transparent 48%),linear-gradient(135deg,#090018,#1e1035,#071a2d)!important; }
        .wb-wallpaper-video { position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;object-fit:cover;z-index:-2;pointer-events:none;filter:brightness(.52) saturate(1.12); }
        body[data-wallpaper]::before { opacity:.34; }
        @keyframes wbFloat { 0%{transform:translate3d(-3%,-2%,0) rotate(-5deg) scale(1)} 50%{transform:translate3d(3%,2%,0) rotate(4deg) scale(1.08)} 100%{transform:translate3d(-1%,4%,0) rotate(-2deg) scale(1.04)} }
        @keyframes wbParticles { from{transform:translate3d(0,0,0)} to{transform:translate3d(-86px,-137px,0)} }
        html[data-theme="dark"] body { background-color:#11101b !important; }
        html[data-theme="dark"] body::before { opacity:.42; }
        html[data-theme="dark"] body::after { opacity:.25; }
        @media(prefers-reduced-motion:reduce){body::before,body::after{animation:none!important}.wb-wallpaper-video,.wb-matrix-rain span{display:none!important}}
      `}</style>
    </>
  )
}
