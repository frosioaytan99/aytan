(() => {
  const ignored = /^(accueil|fil|messages?|amis|profil|mon profil|paramètres|parametres|déconnexion|deconnexion|rechercher|suivant|précédent|precedent|voir plus|charger plus)$/i;
  const profileHref = /profile|profil|user|member|membre|friend|ami/i;
  const candidates = new Set();
  document.querySelectorAll('a[href]').forEach((a) => {
    const text = (a.innerText || a.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || ignored.test(text) || !profileHref.test(a.getAttribute('href') || '')) return;
    const handles = text.match(/@?[a-z0-9_]{3,20}/ig) || [];
    const exact = handles.find((v) => v.replace(/^@/, '').toLowerCase() === text.replace(/^@/, '').toLowerCase());
    if (exact) candidates.add(exact.replace(/^@/, '').toLowerCase());
  });
  const list = [...candidates].sort();
  if (!list.length) {
    alert("Aucun pseudo reconnu automatiquement. Aucun compte ni message n'a été consulté ou modifié. Il faudra adapter l'extracteur à la structure de cette page.");
    return;
  }
  const blob = new Blob([list.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'anciens-amis-weshbien.txt';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  alert(list.length + " pseudo(s) exporté(s) dans anciens-amis-weshbien.txt. Importe ce fichier dans Weshbien2.");
})();