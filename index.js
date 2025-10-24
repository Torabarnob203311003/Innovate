// Loads elements with data-include="path" and injects HTML + runs scripts.
// More verbose errors and a simple case fallback for debugging.
document.addEventListener('DOMContentLoaded', () => {
  const includes = Array.from(document.querySelectorAll('[data-include]'));
  includes.forEach(el => loadInclude(el));
});

async function loadInclude(el) {
  const relPath = el.getAttribute('data-include');
  if (!relPath) return;

  // Resolve against current document location
  const base = new URL(window.location.href);
  const tryPaths = [relPath];

  // simple fallback: try swapping first letter case if initial fails (debug only)
  if (/[A-Za-z]/.test(relPath[0])) {
    const alt = relPath[0] === relPath[0].toLowerCase()
      ? relPath[0].toUpperCase() + relPath.slice(1)
      : relPath[0].toLowerCase() + relPath.slice(1);
    if (alt !== relPath) tryPaths.push(alt);
  }

  for (const p of tryPaths) {
    const url = new URL(p, base).toString();
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const text = await res.text();

      const tpl = document.createElement('template');
      tpl.innerHTML = text;

      // Insert non-script content
      const frag = document.createDocumentFragment();
      tpl.content.childNodes.forEach(n => {
        if (n.tagName && n.tagName.toLowerCase() === 'script') return;
        frag.appendChild(n.cloneNode(true));
      });
      el.appendChild(frag);

      // Execute scripts in order
      const scripts = Array.from(tpl.content.querySelectorAll('script'));
      for (const s of scripts) await runScript(s, el);
      return; // success
    } catch (err) {
      console.warn(`Failed to load ${p} -> ${url}:`, err.message);
      // try next fallback
    }
  }

  // All attempts failed
  el.innerHTML = `<!-- error: unable to load ${relPath} (check path & casing; see console) -->`;
}

function runScript(oldScript, parent) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    Array.from(oldScript.attributes).forEach(a => script.setAttribute(a.name, a.value));
    if (oldScript.src) {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script ${oldScript.src}`));
      script.src = oldScript.src;
      parent.appendChild(script);
    } else {
      script.textContent = oldScript.textContent;
      parent.appendChild(script);
      resolve();
    }
  });
}

