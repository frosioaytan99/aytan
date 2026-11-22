(() => {
  const ignored = /^(accueil|fil|messages?|amis|profil|mon profil|paramètres|parametres|déconnexion|deconnexion|rechercher|suivant|précédent|precedent|voir plus|charger plus)$/i;
  const profileHref = /profile|profil|user|member|membre|friend|ami/i;
  const found = new Map();
  const csvCell = (value) => '"' + String(value || '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ').trim() + '"';

  document.querySelectorAll('a[href]').forEach((a) => {
    if (!a.getClientRects().length) return;
    const href = a.getAttribute('href') || '';
    if (!profileHref.test(href)) return;

    const text = (a.innerText || a.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || ignored.test(text)) return;

    const handles = text.match(/@?[a-z0-9_]{3,20}/ig) || [];
    let username = handles.find((v) => v.replace(/^@/, '').toLowerCase() === text.replace(/^@/, '').toLowerCase());
    if (!username) username = handles.find((v) => /^[a-z0-9_]{3,20}$/i.test(v.replace(/^@/, '')));
    if (!username) {
      try {
        const last = new URL(href, location.href).pathname.split('/').filter(Boolean).pop() || '';
        if (/^[a-z0-9_]{3,20}$/i.test(last)) username = last;
      } catch (_) {}
    }
    if (!username) return;

    const cleanUsername = username.replace(/^@/, '').toLowerCase();
    const displayName = text.replace(/^@?[a-z0-9_]{3,20}$/i, '').trim().slice(0, 80);
    const img = a.querySelector('img');
    let avatar = img ? (img.currentSrc || img.src || '') : '';
    if (!/^https:\/\//i.test(avatar)) avatar = '';
    if (!found.has(cleanUsername)) found.set(cleanUsername, { username: cleanUsername, displayName, avatar });
  });

  const rows = [...found.values()].sort((a, b) => a.username.localeCompare(b.username));
  if (!rows.length) {
    alert("Aucun profil reconnu dans les liens visibles. Ouvre ta liste d'amis et vérifie que les profils sont affichés. Aucun compte ni message n'a été consulté ou modifié.");
    return;
  }

  const csv = ['username,display_name,avatar_url', ...rows.map(p => [csvCell(p.username), csvCell(p.displayName), csvCell(p.avatar)].join(','))].join('\r\n') + '\r\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'profils-visibles-weshbien.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  alert(rows.length + " profil(s) visible(s) exporté(s) dans profils-visibles-weshbien.csv. Tu peux ensuite importer ce CSV dans Weshbien2 si tu disposes du rôle administrateur.");
})();