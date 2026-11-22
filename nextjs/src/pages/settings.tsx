import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'

const wallpapers = [
  { id: 'hearts', name: 'Pluie de cœurs', group: 'Romantique', colors: 'linear-gradient(135deg,#240817,#be185d,#fb7185)' },
  { id: 'aurora', name: 'Aurore', group: 'Ambiance', colors: 'linear-gradient(135deg,#312e81,#0f766e,#be185d)' },
  { id: 'ocean', name: 'Océan profond', group: 'Nature', colors: 'linear-gradient(135deg,#041b3a,#075985,#082f49)' },
  { id: 'sunset', name: 'Coucher de soleil', group: 'Nature', colors: 'linear-gradient(135deg,#31104a,#a83279,#f77f5b)' },
  { id: 'forest', name: 'Forêt', group: 'Nature', colors: 'linear-gradient(135deg,#062b22,#14532d,#064e3b)' },
  { id: 'space', name: 'Galaxie', group: 'Espace', colors: 'linear-gradient(135deg,#08051f,#171044,#020617)' },
  { id: 'neon', name: 'Néon futuriste', group: 'Néon', colors: 'linear-gradient(135deg,#090018,#a21caf,#0891b2)' },
  { id: 'gold', name: 'Or lumineux', group: 'Abstrait', colors: 'linear-gradient(135deg,#241407,#713f12,#29200b)' },
  { id: 'ice', name: 'Glace', group: 'Abstrait', colors: 'linear-gradient(135deg,#0c2340,#164e63,#172554)' },
  { id: 'pink', name: 'Rêve rose', group: 'Abstrait', colors: 'linear-gradient(135deg,#3b123b,#831843,#4c1d95)' },
  { id: 'mountain', name: 'Montagnes', group: 'Nature', colors: 'linear-gradient(135deg,#10243b,#64748b,#cbd5e1)' },
  { id: 'beach', name: 'Plage tropicale', group: 'Nature', colors: 'linear-gradient(135deg,#064e3b,#0e7490,#facc15)' },
  { id: 'waterfall', name: 'Cascade', group: 'Nature', colors: 'linear-gradient(135deg,#082f49,#0e7490,#67e8f9)' },
  { id: 'desert', name: 'Désert', group: 'Nature', colors: 'linear-gradient(135deg,#78350f,#d97706,#fde68a)' },
  { id: 'volcano', name: 'Volcan', group: 'Nature', colors: 'linear-gradient(135deg,#1c1917,#b91c1c,#f97316)' },
  { id: 'jungle', name: 'Jungle', group: 'Nature', colors: 'linear-gradient(135deg,#052e16,#15803d,#a3e635)' },
  { id: 'lavender', name: 'Lavande', group: 'Nature', colors: 'linear-gradient(135deg,#312e81,#8b5cf6,#e9d5ff)' },
  { id: 'cherry', name: 'Fleurs de cerisier', group: 'Nature', colors: 'linear-gradient(135deg,#831843,#ec4899,#fbcfe8)' },
  { id: 'rain', name: 'Pluie nocturne', group: 'Ambiance', colors: 'linear-gradient(135deg,#0f172a,#334155,#38bdf8)' },
  { id: 'storm', name: 'Orage électrique', group: 'Ambiance', colors: 'linear-gradient(135deg,#111827,#4c1d95,#a78bfa)' },
  { id: 'fire', name: 'Flammes', group: 'Ambiance', colors: 'linear-gradient(135deg,#431407,#c2410c,#facc15)' },
  { id: 'smoke', name: 'Fumée colorée', group: 'Ambiance', colors: 'linear-gradient(135deg,#18181b,#6d28d9,#db2777)' },
  { id: 'clouds', name: 'Nuages pastel', group: 'Ambiance', colors: 'linear-gradient(135deg,#64748b,#c4b5fd,#fbcfe8)' },
  { id: 'dream', name: 'Rêve holographique', group: 'Ambiance', colors: 'linear-gradient(135deg,#312e81,#0891b2,#f0abfc)' },
  { id: 'minimal', name: 'Minimal sombre', group: 'Abstrait', colors: 'linear-gradient(135deg,#09090b,#27272a,#52525b)' },
  { id: 'marble', name: 'Marbre violet', group: 'Abstrait', colors: 'linear-gradient(135deg,#18112b,#6d5ba6,#c4b5fd)' },
  { id: 'crystal', name: 'Cristal', group: 'Abstrait', colors: 'linear-gradient(135deg,#164e63,#0e7490,#a5f3fc)' },
  { id: 'copper', name: 'Cuivre', group: 'Abstrait', colors: 'linear-gradient(135deg,#431407,#9a3412,#fdba74)' },
  { id: 'silver', name: 'Argent', group: 'Abstrait', colors: 'linear-gradient(135deg,#1f2937,#64748b,#e2e8f0)' },
  { id: 'emerald', name: 'Émeraude', group: 'Abstrait', colors: 'linear-gradient(135deg,#022c22,#047857,#6ee7b7)' },
  { id: 'ruby', name: 'Rubis', group: 'Abstrait', colors: 'linear-gradient(135deg,#450a0a,#be123c,#fda4af)' },
  { id: 'sapphire', name: 'Saphir', group: 'Abstrait', colors: 'linear-gradient(135deg,#172554,#1d4ed8,#93c5fd)' },
  { id: 'cosmos', name: 'Cosmos', group: 'Espace', colors: 'linear-gradient(135deg,#020617,#312e81,#c084fc)' },
  { id: 'moon', name: 'Clair de lune', group: 'Espace', colors: 'linear-gradient(135deg,#0f172a,#475569,#e2e8f0)' },
  { id: 'stars', name: 'Pluie d’étoiles', group: 'Espace', colors: 'linear-gradient(135deg,#020617,#1e1b4b,#818cf8)' },
  { id: 'matrix', name: 'Code numérique', group: 'Néon', colors: 'linear-gradient(135deg,#052e16,#15803d,#4ade80)' },
  { id: 'cyber', name: 'Cyberpunk', group: 'Néon', colors: 'linear-gradient(135deg,#2e1065,#be185d,#22d3ee)' },
  { id: 'laser', name: 'Laser', group: 'Néon', colors: 'linear-gradient(135deg,#1e1b4b,#7c3aed,#f0abfc)' },
  { id: 'rainbow', name: 'Arc-en-ciel', group: 'Néon', colors: 'linear-gradient(135deg,#7f1d1d,#2563eb,#facc15)' },
  { id: 'electric', name: 'Électricité', group: 'Néon', colors: 'linear-gradient(135deg,#172554,#1d4ed8,#67e8f9)' },
  { id: 'nebula', name: 'Nébuleuse', group: 'Espace', colors: 'linear-gradient(135deg,#020617,#312e81,#a855f7)' },
  { id: 'galaxy', name: 'Voie lactée', group: 'Espace', colors: 'linear-gradient(135deg,#041b3a,#075985,#22d3ee)' },
  { id: 'blackhole', name: 'Trou noir', group: 'Espace', colors: 'linear-gradient(135deg,#31104a,#a83279,#f77f5b)' },
  { id: 'planet', name: 'Planète bleue', group: 'Espace', colors: 'linear-gradient(135deg,#062b22,#14532d,#6ee7b7)' },
  { id: 'comet', name: 'Comète', group: 'Espace', colors: 'linear-gradient(135deg,#1e1b4b,#7c3aed,#f0abfc)' },
  { id: 'meteor', name: 'Pluie de météores', group: 'Espace', colors: 'linear-gradient(135deg,#090018,#a21caf,#0891b2)' },
  { id: 'stardust', name: 'Poussière d’étoiles', group: 'Espace', colors: 'linear-gradient(135deg,#241407,#713f12,#fbbf24)' },
  { id: 'eclipse', name: 'Éclipse', group: 'Espace', colors: 'linear-gradient(135deg,#0c2340,#164e63,#93c5fd)' },
  { id: 'deepsea', name: 'Fond marin', group: 'Nature', colors: 'linear-gradient(135deg,#3b123b,#831843,#fbcfe8)' },
  { id: 'coral', name: 'Récif corallien', group: 'Nature', colors: 'linear-gradient(135deg,#10243b,#64748b,#cbd5e1)' },
  { id: 'lagoon', name: 'Lagon turquoise', group: 'Nature', colors: 'linear-gradient(135deg,#064e3b,#0e7490,#facc15)' },
  { id: 'arctic', name: 'Banquise', group: 'Nature', colors: 'linear-gradient(135deg,#082f49,#0e7490,#67e8f9)' },
  { id: 'glacier', name: 'Glacier', group: 'Nature', colors: 'linear-gradient(135deg,#78350f,#d97706,#fde68a)' },
  { id: 'northern', name: 'Aurore polaire', group: 'Nature', colors: 'linear-gradient(135deg,#1c1917,#b91c1c,#f97316)' },
  { id: 'bamboo', name: 'Bambouseraie', group: 'Nature', colors: 'linear-gradient(135deg,#052e16,#15803d,#a3e635)' },
  { id: 'moss', name: 'Mousse', group: 'Nature', colors: 'linear-gradient(135deg,#312e81,#8b5cf6,#e9d5ff)' },
  { id: 'autumn', name: 'Automne', group: 'Nature', colors: 'linear-gradient(135deg,#831843,#ec4899,#fbcfe8)' },
  { id: 'spring', name: 'Printemps', group: 'Nature', colors: 'linear-gradient(135deg,#0f172a,#334155,#38bdf8)' },
  { id: 'winter', name: 'Hiver', group: 'Nature', colors: 'linear-gradient(135deg,#111827,#4c1d95,#a78bfa)' },
  { id: 'meadow', name: 'Prairie', group: 'Nature', colors: 'linear-gradient(135deg,#431407,#c2410c,#facc15)' },
  { id: 'wildflower', name: 'Fleurs sauvages', group: 'Nature', colors: 'linear-gradient(135deg,#18181b,#6d28d9,#db2777)' },
  { id: 'rose', name: 'Rose velours', group: 'Nature', colors: 'linear-gradient(135deg,#020617,#312e81,#a855f7)' },
  { id: 'oasis', name: 'Oasis', group: 'Nature', colors: 'linear-gradient(135deg,#041b3a,#075985,#22d3ee)' },
  { id: 'savanna', name: 'Savane', group: 'Nature', colors: 'linear-gradient(135deg,#31104a,#a83279,#f77f5b)' },
  { id: 'canyon', name: 'Canyon', group: 'Nature', colors: 'linear-gradient(135deg,#062b22,#14532d,#6ee7b7)' },
  { id: 'dusk', name: 'Crépuscule', group: 'Ambiance', colors: 'linear-gradient(135deg,#1e1b4b,#7c3aed,#f0abfc)' },
  { id: 'dawn', name: 'Aube', group: 'Ambiance', colors: 'linear-gradient(135deg,#090018,#a21caf,#0891b2)' },
  { id: 'twilight', name: 'Heure bleue', group: 'Ambiance', colors: 'linear-gradient(135deg,#241407,#713f12,#fbbf24)' },
  { id: 'aurora-pink', name: 'Aurore rose', group: 'Ambiance', colors: 'linear-gradient(135deg,#0c2340,#164e63,#93c5fd)' },
  { id: 'aurora-blue', name: 'Aurore bleue', group: 'Ambiance', colors: 'linear-gradient(135deg,#3b123b,#831843,#fbcfe8)' },
  { id: 'aurora-green', name: 'Aurore verte', group: 'Ambiance', colors: 'linear-gradient(135deg,#10243b,#64748b,#cbd5e1)' },
  { id: 'bokeh', name: 'Lumières floues', group: 'Ambiance', colors: 'linear-gradient(135deg,#064e3b,#0e7490,#facc15)' },
  { id: 'glow', name: 'Lueur', group: 'Ambiance', colors: 'linear-gradient(135deg,#082f49,#0e7490,#67e8f9)' },
  { id: 'silk', name: 'Soie lumineuse', group: 'Ambiance', colors: 'linear-gradient(135deg,#78350f,#d97706,#fde68a)' },
  { id: 'waves', name: 'Ondes', group: 'Ambiance', colors: 'linear-gradient(135deg,#1c1917,#b91c1c,#f97316)' },
  { id: 'ripple', name: 'Ondulations', group: 'Ambiance', colors: 'linear-gradient(135deg,#052e16,#15803d,#a3e635)' },
  { id: 'particles', name: 'Particules', group: 'Ambiance', colors: 'linear-gradient(135deg,#312e81,#8b5cf6,#e9d5ff)' },
  { id: 'confetti', name: 'Confettis', group: 'Ambiance', colors: 'linear-gradient(135deg,#831843,#ec4899,#fbcfe8)' },
  { id: 'sparkle', name: 'Étincelles', group: 'Ambiance', colors: 'linear-gradient(135deg,#0f172a,#334155,#38bdf8)' },
  { id: 'velvet', name: 'Velours', group: 'Abstrait', colors: 'linear-gradient(135deg,#111827,#4c1d95,#a78bfa)' },
  { id: 'op-art', name: 'Op art', group: 'Abstrait', colors: 'linear-gradient(135deg,#431407,#c2410c,#facc15)' },
  { id: 'geometry', name: 'Géométrie', group: 'Abstrait', colors: 'linear-gradient(135deg,#18181b,#6d28d9,#db2777)' },
  { id: 'prism', name: 'Prisme', group: 'Abstrait', colors: 'linear-gradient(135deg,#020617,#312e81,#a855f7)' },
  { id: 'iridescent', name: 'Iridescent', group: 'Abstrait', colors: 'linear-gradient(135deg,#041b3a,#075985,#22d3ee)' },
  { id: 'hologram', name: 'Hologramme', group: 'Abstrait', colors: 'linear-gradient(135deg,#31104a,#a83279,#f77f5b)' },
  { id: 'liquid', name: 'Liquide', group: 'Abstrait', colors: 'linear-gradient(135deg,#062b22,#14532d,#6ee7b7)' },
  { id: 'gradient', name: 'Dégradé pastel', group: 'Abstrait', colors: 'linear-gradient(135deg,#1e1b4b,#7c3aed,#f0abfc)' },
  { id: 'pastel', name: 'Pastel', group: 'Abstrait', colors: 'linear-gradient(135deg,#090018,#a21caf,#0891b2)' },
  { id: 'monochrome', name: 'Monochrome', group: 'Abstrait', colors: 'linear-gradient(135deg,#241407,#713f12,#fbbf24)' },
  { id: 'graphite', name: 'Graphite', group: 'Abstrait', colors: 'linear-gradient(135deg,#0c2340,#164e63,#93c5fd)' },
  { id: 'obsidian', name: 'Obsidienne', group: 'Abstrait', colors: 'linear-gradient(135deg,#3b123b,#831843,#fbcfe8)' },
  { id: 'amethyst', name: 'Améthyste', group: 'Abstrait', colors: 'linear-gradient(135deg,#10243b,#64748b,#cbd5e1)' },
  { id: 'topaz', name: 'Topaze', group: 'Abstrait', colors: 'linear-gradient(135deg,#064e3b,#0e7490,#facc15)' },
  { id: 'jade', name: 'Jade', group: 'Abstrait', colors: 'linear-gradient(135deg,#082f49,#0e7490,#67e8f9)' },
  { id: 'turquoise', name: 'Turquoise', group: 'Abstrait', colors: 'linear-gradient(135deg,#78350f,#d97706,#fde68a)' },
  { id: 'magenta', name: 'Magenta', group: 'Néon', colors: 'linear-gradient(135deg,#1c1917,#b91c1c,#f97316)' },
  { id: 'ultraviolet', name: 'Ultraviolet', group: 'Néon', colors: 'linear-gradient(135deg,#052e16,#15803d,#a3e635)' },
  { id: 'synthwave', name: 'Synthwave', group: 'Néon', colors: 'linear-gradient(135deg,#312e81,#8b5cf6,#e9d5ff)' },
  { id: 'arcade', name: 'Arcade rétro', group: 'Néon', colors: 'linear-gradient(135deg,#831843,#ec4899,#fbcfe8)' },
  { id: 'plasma', name: 'Plasma', group: 'Néon', colors: 'linear-gradient(135deg,#0f172a,#334155,#38bdf8)' },
  { id: 'glitch', name: 'Glitch', group: 'Néon', colors: 'linear-gradient(135deg,#111827,#4c1d95,#a78bfa)' },
]


const appThemes = [
  {id:'lilas',name:'Lilas élégant',category:'Élégant',accent:'#7956d8',bg:'#f7f4ff',surface:'#ffffff',text:'#28213d',muted:'#817991',border:'#e8e0f5',preview:'linear-gradient(135deg,#312e81,#a78bfa,#f5d0fe)'},
  {id:'cyberpunk',name:'Cyberpunk',category:'Futuriste',accent:'#ec4899',bg:'#10091e',surface:'#1d1230',text:'#f8edff',muted:'#c4a9d8',border:'#4b2860',preview:'linear-gradient(135deg,#090018,#ec4899,#06b6d4)'},
  {id:'ocean',name:'Océan',category:'Nature',accent:'#0891b2',bg:'#effaff',surface:'#ffffff',text:'#123044',muted:'#648394',border:'#cce8f0',preview:'linear-gradient(135deg,#082f49,#0891b2,#67e8f9)'},
  {id:'rose',name:'Rose douceur',category:'Élégant',accent:'#db2777',bg:'#fff4f8',surface:'#ffffff',text:'#442034',muted:'#987487',border:'#f4d6e4',preview:'linear-gradient(135deg,#831843,#ec4899,#fbcfe8)'},
  {id:'foret',name:'Forêt',category:'Nature',accent:'#16845b',bg:'#f0faf4',surface:'#ffffff',text:'#17382b',muted:'#6f8d7e',border:'#d1e9da',preview:'linear-gradient(135deg,#052e16,#15803d,#a3e635)'},
  {id:'sunset',name:'Coucher de soleil',category:'Nature',accent:'#e76b45',bg:'#fff6f0',surface:'#ffffff',text:'#44271f',muted:'#98796e',border:'#f2ded3',preview:'linear-gradient(135deg,#431407,#c2410c,#fbbf24)'},
  {id:'nuit',name:'Nuit profonde',category:'Sombre',accent:'#8b7cf6',bg:'#0b1020',surface:'#151c31',text:'#edf0ff',muted:'#a5aecb',border:'#303a59',preview:'linear-gradient(135deg,#020617,#312e81,#818cf8)'},
  {id:'graphite',name:'Graphite',category:'Sombre',accent:'#94a3b8',bg:'#17191f',surface:'#242832',text:'#f1f3f6',muted:'#a8afbd',border:'#3b414d',preview:'linear-gradient(135deg,#09090b,#475569,#cbd5e1)'},
  {id:'menthe',name:'Menthe',category:'Élégant',accent:'#0d9488',bg:'#effdfa',surface:'#ffffff',text:'#173b38',muted:'#6e918d',border:'#d0eeea',preview:'linear-gradient(135deg,#064e3b,#0d9488,#99f6e4)'},
  {id:'gold',name:'Or royal',category:'Luxe',accent:'#c08a28',bg:'#17120a',surface:'#251c10',text:'#fff4d6',muted:'#c8b58c',border:'#574326',preview:'linear-gradient(135deg,#1c1205,#a16207,#facc15)'},
  {id:'lavande',name:'Lavande',category:'Élégant',accent:'#9672df',bg:'#f8f5ff',surface:'#ffffff',text:'#302746',muted:'#89809c',border:'#e8def8',preview:'linear-gradient(135deg,#312e81,#8b5cf6,#e9d5ff)'},
  {id:'rouge',name:'Rouge passion',category:'Audacieux',accent:'#dc2626',bg:'#fff5f5',surface:'#ffffff',text:'#401d1d',muted:'#987575',border:'#f3d7d7',preview:'linear-gradient(135deg,#450a0a,#dc2626,#fca5a5)'}
]

const wallpaperVideoSources: Record<string, string> = {
  ocean: 'https://videos.pexels.com/video-files/33734611/14323344_3840_2160_60fps.mp4',
  forest: 'https://videos.pexels.com/video-files/31346766/13378120_3840_2160_60fps.mp4',
  sunset: 'https://videos.pexels.com/video-files/20583506/20583506-uhd_3840_2160_30fps.mp4',
  stars: 'https://videos.pexels.com/video-files/29628759/12749515_3840_2160_30fps.mp4',
}
const wallpaperVideoByTheme: Record<string, string> = {
  ocean:'ocean',beach:'ocean',waterfall:'ocean',deepsea:'ocean',coral:'ocean',lagoon:'ocean',arctic:'ocean',glacier:'ocean',waves:'ocean',ripple:'ocean',
  forest:'forest',jungle:'forest',emerald:'forest',bamboo:'forest',moss:'forest',meadow:'forest',canyon:'forest',spring:'forest',
  sunset:'sunset',desert:'sunset',volcano:'sunset',fire:'sunset',autumn:'sunset',dawn:'sunset',dusk:'sunset',savanna:'sunset',
  aurora:'stars',space:'stars',cosmos:'stars',stars:'stars',moon:'stars',nebula:'stars',galaxy:'stars',blackhole:'stars',comet:'stars',meteor:'stars',stardust:'stars',eclipse:'stars',planet:'stars',
}

const darkWallpapers = [
  { id: 'hearts', name: 'Pluie de cœurs', group: 'Romantique', colors: 'linear-gradient(135deg,#180611,#701a3d,#be185d)' },
  { id: 'cosmos', name: 'Cosmos nocturne', group: 'Espace', colors: 'linear-gradient(135deg,#020617,#312e81,#a855f7)' },
  { id: 'rain', name: 'Pluie sur la ville', group: 'Ville', colors: 'linear-gradient(135deg,#020617,#164e63,#64748b)' },
  { id: 'ocean', name: 'Océan de nuit', group: 'Nature', colors: 'linear-gradient(135deg,#020b20,#075985,#0e7490)' },
  { id: 'forest', name: 'Forêt mystérieuse', group: 'Nature', colors: 'linear-gradient(135deg,#020b08,#064e3b,#14532d)' },
  { id: 'neon', name: 'Néons violets', group: 'Futuriste', colors: 'linear-gradient(135deg,#090018,#6b21a8,#db2777)' },
  { id: 'matrix', name: 'Code Matrix', group: 'Futuriste', colors: 'linear-gradient(135deg,#010805,#052e16,#22c55e)' },
  { id: 'aurora', name: 'Aurores boréales', group: 'Espace', colors: 'linear-gradient(135deg,#071126,#0f766e,#7c3aed)' },
  { id: 'volcano', name: 'Volcan incandescent', group: 'Nature', colors: 'linear-gradient(135deg,#090909,#7f1d1d,#f97316)' },
]

export default function SettingsPage() {
  const [theme, setTheme] = useState<'light'|'dark'>('light')
  const [wallpaper, setWallpaper] = useState('aurora')
  const [darkWallpaper, setDarkWallpaper] = useState('cosmos')
  const [status, setStatus] = useState('')
  const [appTheme, setAppTheme] = useState('lilas')
  const [themeCategory, setThemeCategory] = useState('Tous')
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
    try { const savedAppTheme = localStorage.getItem('weshbien-app-theme') || 'lilas'; setAppTheme(savedAppTheme); document.documentElement.dataset.appTheme = savedAppTheme } catch {}
    try { const saved = localStorage.getItem('weshbien-wallpaper') || 'aurora'; const darkSaved = localStorage.getItem('weshbien-dark-wallpaper') || 'cosmos'; setWallpaper(saved); setDarkWallpaper(darkSaved); const active = document.documentElement.dataset.theme === 'dark' ? darkSaved : saved; document.documentElement.dataset.wallpaper = active; document.body.dataset.wallpaper = active } catch {}
  }, [])
  function chooseAppTheme(id: string) {
    setAppTheme(id)
    document.documentElement.dataset.appTheme = id
    try { localStorage.setItem('weshbien-app-theme', id) } catch {}
    const selected = appThemes.find(item => item.id === id)
    setStatus('Thème « ' + (selected?.name || id) + ' » appliqué à toute l’interface.')
  }
  function chooseWallpaper(id: string) {
    setWallpaper(id)
    try { localStorage.setItem('weshbien-wallpaper', id) } catch {}
    document.body.dataset.wallpaper = id
    document.documentElement.dataset.wallpaper = id
    window.dispatchEvent(new Event('weshbien:wallpaper-change'))
    setStatus('Thème complet appliqué sur cet appareil : interface, couleurs et fond vidéo.')
  }
  function chooseDarkWallpaper(id: string) {
    setDarkWallpaper(id)
    try { localStorage.setItem('weshbien-dark-wallpaper', id) } catch {}
    if (document.documentElement.dataset.theme === 'dark') { document.documentElement.dataset.wallpaper = id; document.body.dataset.wallpaper = id }
    window.dispatchEvent(new Event('weshbien:wallpaper-change'))
    setStatus('Ambiance sombre enregistrée : ' + (darkWallpapers.find(item => item.id === id)?.name || id))
  }
  function changeTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    const activeWallpaper = next === 'dark' ? darkWallpaper : wallpaper
    document.documentElement.dataset.wallpaper = activeWallpaper; document.body.dataset.wallpaper = activeWallpaper
    window.dispatchEvent(new Event('weshbien:wallpaper-change'))
    try { localStorage.setItem('weshbien-theme', next) } catch {}
  }
  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) setStatus('Déconnexion impossible : ' + error.message)
    else window.location.href = '/auth'
  }
  return <main className="app-shell"><section className="profile-wrap wallpaper-settings">
    <small>ESPACE PERSONNEL</small><h1>Paramètres</h1>
    <div className="card profile-form settings-main-card">
      <h2>Mon compte</h2>
      <Link href="/profile">👤 Modifier mon profil</Link>
      <button type="button" onClick={changeTheme}>{theme === 'dark' ? '☀️ Passer en mode clair' : '🌙 Passer en mode sombre'}</button>
      <button type="button" className="friend-secondary" onClick={logout}>↪ Déconnexion</button>
    </div>

    <section className="app-theme-store">
      <div className="app-theme-store-heading"><div><span>BOUTIQUE DE THÈMES</span><h2>Personnalise toute ton expérience</h2><p>Un thème modifie les couleurs des pages, des cartes, des menus et des boutons.</p></div><b>{appThemes.length} thèmes gratuits</b></div>
      <div className="app-theme-categories">
        {['Tous','Élégant','Futuriste','Nature','Sombre','Luxe','Audacieux'].map(category => <button type="button" key={category} className={themeCategory===category?'active':''} onClick={()=>setThemeCategory(category)}>{category}</button>)}
      </div>
      <div className="app-theme-grid">
        {appThemes.filter(item=>themeCategory==='Tous'||item.category===themeCategory).map(item=><button type="button" key={item.id} className={'app-theme-card'+(appTheme===item.id?' active':'')} onClick={()=>chooseAppTheme(item.id)} aria-pressed={appTheme===item.id}>
          <span className="app-theme-preview" style={{background:item.preview}}>
            <i className="theme-demo-window"><b/><b/><b/><em/><em/></i>
            <i className="theme-demo-bubble"/>
            <strong>{item.name}</strong>
          </span>
          <span className="app-theme-card-footer"><span><b>{item.name}</b><small>{item.category}</small></span><span className="app-theme-apply">{appTheme===item.id?'✓ Actif':'Appliquer'}</span></span>
        </button>)}
      </div>
      <p className="app-theme-note">Le thème choisi est mémorisé sur cet appareil. Les fonds animés restent personnalisables séparément juste en dessous.</p>
    </section>
    <div className="wallpaper-heading"><div><span>PERSONNALISATION</span><h2>Thèmes complets & vidéos 4K</h2><p>Choisis une ambiance : le fond, les couleurs, les boutons, les cartes et les menus changent ensemble.</p></div><b>100 thèmes</b></div>
    <div className="wallpaper-grid">
      {wallpapers.map(item => <button type="button" key={item.id} onClick={() => chooseWallpaper(item.id)} className={'wallpaper-option' + (wallpaper === item.id ? ' selected' : '')} aria-pressed={wallpaper === item.id}>
        <span className="wallpaper-preview" style={{ background: item.colors }}><i/><i/><i/><em>APERÇU LÉGER</em></span>
        <span className="wallpaper-option-copy"><strong>{item.name}</strong><small>{item.group}</small></span>
        <span className="wallpaper-check">{wallpaper === item.id ? '✓' : '+'}</span>
      </button>)}
    </div>
    <p className="wallpaper-status" role="status">{status || 'Ton thème est enregistré sur cet appareil.'}</p>
    <div className="wallpaper-heading dark-wallpaper-heading"><div><span>MODE SOMBRE</span><h2>Ambiances nocturnes & vidéos 4K</h2><p>Ces fonds sont réservés au mode sombre. Ton thème clair garde son propre fond.</p></div><b>8 ambiances</b></div>
    <div className="wallpaper-grid">
      {darkWallpapers.map(item => <button type="button" key={item.id} onClick={() => chooseDarkWallpaper(item.id)} className={'wallpaper-option' + (darkWallpaper === item.id ? ' selected' : '')} aria-pressed={darkWallpaper === item.id}>
        <span className="wallpaper-preview" style={{ background: item.colors }}>{wallpaperVideoByTheme[item.id] && <video className="wallpaper-preview-video" src={wallpaperVideoSources[wallpaperVideoByTheme[item.id]]} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />}<i/><i/><i/><em>{wallpaperVideoByTheme[item.id] ? 'APERÇU VIDÉO' : 'FOND ANIMÉ'}</em></span>
        <span className="wallpaper-option-copy"><strong>{item.name}</strong><small>{item.group}</small></span>
        <span className="wallpaper-check">{darkWallpaper === item.id ? '✓' : '+'}</span>
      </button>)}
    </div>
    <div className="wallpaper-library-link"><strong>Vidéos 4K en mouvement</strong><p>Les scènes vidéo sont diffusées en UHD 3840 × 2160 quand l’appareil le permet. Pour économiser les données ou préserver la batterie, les appareils compatibles avec l’économie de données utilisent le fond animé léger à la place.</p><small>Vidéos libres issues de Pexels : <a href="https://www.pexels.com/video/ocean-from-above-17098934/" target="_blank" rel="noreferrer">Océan</a> · <a href="https://www.pexels.com/video/stunning-forest-waterfall-aerial-view-31346765/" target="_blank" rel="noreferrer">Forêt & cascade</a> · <a href="https://www.pexels.com/video/aerial-view-of-a-forest-at-sunset-20583509/" target="_blank" rel="noreferrer">Coucher de soleil</a> · <a href="https://www.pexels.com/video/stunning-night-sky-time-lapse-in-forest-29628756/" target="_blank" rel="noreferrer">Ciel étoilé</a>.</small></div>
  </section>
  <style jsx global>{`

    .app-theme-store{margin:30px 0 38px;padding:22px;border:1px solid color-mix(in srgb,var(--border,#e5e1ed) 55%,transparent);border-radius:22px;background:color-mix(in srgb,var(--surface,#fff) 24%,transparent)!important;backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
    .app-theme-store-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:14px}
    .app-theme-store-heading>div>span{font-size:10px;letter-spacing:1.5px;font-weight:900;color:var(--accent,#7c3aed)}
    .app-theme-store-heading,.app-theme-store-heading h2,.app-theme-store-heading p,.app-theme-note{ text-shadow:0 1px 8px color-mix(in srgb,var(--bg,#fff) 45%,transparent) }
    .app-theme-store-heading h2{margin:7px 0;font-size:clamp(22px,4vw,30px)}
    .app-theme-store-heading p,.app-theme-note{color:var(--muted,#777);font-size:13px;line-height:1.6}
    .app-theme-store-heading>b{white-space:nowrap;border-radius:30px;padding:8px 11px;background:var(--surface,#fff);font-size:11px}
    .app-theme-categories{display:flex;gap:8px;overflow-x:auto;padding:17px 0}
    .app-theme-categories button{border:1px solid var(--border,#e5e1ed);border-radius:30px;padding:8px 13px;background:transparent;color:var(--text,#29263a);white-space:nowrap;font-size:11px;font-weight:800}
    .app-theme-categories button.active{background:var(--accent,#7c3aed);border-color:var(--accent,#7c3aed);color:white}
    .app-theme-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}
    .app-theme-card{min-width:0;padding:8px;border:2px solid color-mix(in srgb,var(--border,#e5e1ed) 58%,transparent);border-radius:17px;background:color-mix(in srgb,var(--surface,#fff) 32%,transparent)!important;color:var(--text,#29263a);text-align:left;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
    .app-theme-card.active{border-color:var(--accent,#7c3aed);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent,#7c3aed) 17%,transparent)}
    .app-theme-preview{height:126px;position:relative;display:block;overflow:hidden;border-radius:11px;padding:10px}
    .theme-demo-window{position:absolute;left:13px;top:13px;width:66%;height:72px;border-radius:9px;background:#ffffffdf;padding:8px;box-shadow:0 5px 16px #0003}
    .theme-demo-window b{display:inline-block;width:6px;height:6px;margin-right:4px;border-radius:50%;background:#a78bfa}
    .theme-demo-window em{display:block;height:8px;margin-top:8px;border-radius:5px;background:#8b7cf688}
    .theme-demo-window em:last-child{width:65%;background:#94a3b866}
    .theme-demo-bubble{position:absolute;right:14px;bottom:32px;width:35px;height:35px;border-radius:12px;background:#ffffffb8;box-shadow:0 4px 12px #0002}
    .app-theme-preview>strong{position:absolute;bottom:9px;left:11px;color:white;font-size:10px;text-shadow:0 1px 5px #000}
    .app-theme-card-footer{display:flex;align-items:center;justify-content:space-between;gap:5px;padding:9px 2px 2px}
    .app-theme-card-footer>span:first-child{display:grid;gap:3px;min-width:0}
    .app-theme-card-footer b{font-size:12px}.app-theme-card-footer small{font-size:10px;color:var(--muted,#777)}
    .app-theme-apply{font-size:10px;font-weight:900;color:var(--accent,#7c3aed);white-space:nowrap}
    .app-theme-note{margin:15px 0 0}
    @media(max-width:650px){.app-theme-store{padding:15px}.app-theme-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.app-theme-preview{height:108px}.app-theme-store-heading{align-items:flex-start;flex-direction:column}}

    .wallpaper-settings{max-width:1050px!important}
    .settings-main-card{display:grid;gap:12px;margin:18px 0 32px;padding:22px}
    .settings-main-card h2{margin:0 0 4px}
    .settings-main-card>a{color:var(--accent,#7c3aed);font-weight:700}
    .settings-main-card button{width:100%;padding:12px 15px;border:1px solid var(--border,#e5e1ed);border-radius:13px;background:var(--surface,#fff);color:var(--text,#29263a);text-align:left;font:inherit;font-weight:700}
    .wallpaper-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:26px 0 16px}
    .wallpaper-heading span{font-size:11px;letter-spacing:1.5px;font-weight:800;color:var(--accent,#7c3aed)}
    .wallpaper-heading h2{margin:6px 0;font-size:clamp(24px,4vw,32px)}
    .wallpaper-heading p{margin:0;color:var(--muted,#777)}
    .wallpaper-heading>b{white-space:nowrap;padding:8px 12px;border-radius:99px;background:var(--surface,#fff);font-size:12px}
    .wallpaper-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
    .wallpaper-option{position:relative;display:flex;flex-direction:column;gap:10px;min-width:0;padding:9px;border:2px solid var(--border,#e5e1ed);border-radius:18px;background:var(--card,#fff);color:var(--text,#29263a);text-align:left;cursor:pointer;overflow:hidden}
    .wallpaper-option.selected{border-color:var(--accent,#7c3aed);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent,#7c3aed) 15%,transparent)}
    .wallpaper-preview{position:relative;display:block;overflow:hidden;height:110px;border-radius:12px;background-size:100% 100%;animation:none}
    .wallpaper-preview-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none}
    .wallpaper-preview>i,.wallpaper-preview>em{z-index:1}
    .wallpaper-preview i{position:absolute;width:80px;height:80px;border-radius:50%;filter:none;background:#ffffff22;animation:none}
    .wallpaper-preview i:nth-child(1){left:8%;top:20%}.wallpaper-preview i:nth-child(2){right:10%;top:10%}.wallpaper-preview i:nth-child(3){left:45%;bottom:-30%}
    .wallpaper-preview em{position:absolute;right:8px;bottom:8px;padding:5px 8px;border-radius:20px;background:#10101cbb;color:#fff;font-size:9px;font-style:normal;font-weight:900;letter-spacing:.7px;backdrop-filter:blur(8px)}
    
    .wallpaper-option-copy{display:flex;flex-direction:column;gap:3px;padding:0 3px 2px}.wallpaper-option-copy strong{font-size:14px}.wallpaper-option-copy small{color:var(--muted,#777)}
    .wallpaper-check{position:absolute;right:15px;top:15px;width:25px;height:25px;display:grid;place-items:center;border-radius:50%;background:#fff;color:#6d28d9;font-weight:900;box-shadow:0 2px 8px #0003}
    .wallpaper-status{min-height:22px;color:var(--accent,#7c3aed);font-size:13px;font-weight:700}
    .wallpaper-library-link{margin:26px 0;padding:20px;border:1px solid var(--border,#e5e1ed);border-radius:18px;background:var(--card,#fff)}
    .wallpaper-library-link p{color:var(--muted,#777);line-height:1.55}.wallpaper-library-link small{display:block;color:var(--muted,#777);line-height:1.8}.wallpaper-library-link a{color:var(--accent,#7c3aed);font-weight:800}
    .wallpaper-library-link a{color:var(--accent,#7c3aed);font-weight:800}
    @media(max-width:650px){.wallpaper-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.wallpaper-preview{height:90px}.wallpaper-option{padding:7px;border-radius:15px}.wallpaper-option-copy strong{font-size:13px}.wallpaper-heading{align-items:start;flex-direction:column}}
  `}</style>
  </main>
}
