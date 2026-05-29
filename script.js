const uploadForm = document.getElementById('upload-form');
const trackList = document.getElementById('track-list');
const trackTemplate = document.getElementById('track-template');

const generateForm = document.getElementById('generate-form');
const generatedPlayer = document.getElementById('generated-player');
const generationMeta = document.getElementById('generation-meta');

const tracks = [];

function renderTracks() {
  trackList.innerHTML = '';
  for (const track of tracks) {
    const node = trackTemplate.content.cloneNode(true);
    node.querySelector('.title').textContent = track.title;
    node.querySelector('.meta').textContent = `${track.artist} • ${track.createdAt}`;
    const player = node.querySelector('.player');
    player.src = track.url;
    const dl = node.querySelector('.download');
    dl.href = track.url;
    dl.textContent = `Télécharger (${track.filename})`;
    dl.download = track.filename;
    trackList.appendChild(node);
  }
}

uploadForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = document.getElementById('track-title').value.trim();
  const artist = document.getElementById('track-artist').value.trim();
  const fileInput = document.getElementById('track-file');
  const file = fileInput.files[0];

  if (!file) return;

  tracks.unshift({
    title,
    artist,
    filename: file.name,
    url: URL.createObjectURL(file),
    createdAt: new Date().toLocaleString('fr-FR')
  });

  uploadForm.reset();
  renderTracks();
});

async function generateSimpleToneWav(durationSec = 20) {
  const sampleRate = 44100;
  const length = sampleRate * durationSec;
  const buffer = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const base = Math.sin(2 * Math.PI * 220 * t) * 0.35;
    const harmony = Math.sin(2 * Math.PI * 329.63 * t) * 0.2;
    const envelope = Math.min(1, i / 4000) * Math.min(1, (length - i) / 4000);
    buffer[i] = (base + harmony) * envelope;
  }

  const wav = encodeWav(buffer, sampleRate);
  return new Blob([wav], { type: 'audio/wav' });
}

function encodeWav(samples, sampleRate) {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

generateForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const style = document.getElementById('style').value;
  const mood = document.getElementById('mood').value;
  const duration = Number(document.getElementById('duration').value);

  const blob = await generateSimpleToneWav(duration);
  const url = URL.createObjectURL(blob);
  generatedPlayer.src = url;
  generationMeta.textContent = `Démo générée: ${style}, ambiance ${mood}, ${duration}s.`;

  tracks.unshift({
    title: `IA Demo - ${style}`,
    artist: 'MusicIA Bot',
    filename: `ia-demo-${Date.now()}.wav`,
    url,
    createdAt: new Date().toLocaleString('fr-FR')
  });
  renderTracks();
});
