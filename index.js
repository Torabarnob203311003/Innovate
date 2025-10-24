// Loads files specified in elements with data-include and injects their HTML.
document.addEventListener('DOMContentLoaded', () => {
  const includes = Array.from(document.querySelectorAll('[data-include]'));
  if (!includes.length) return;

  includes.forEach(el => loadInclude(el));
});

async function loadInclude(el) {
  const path = el.getAttribute('data-include');
  if (!path) return;
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    const html = await res.text();

    // Parse fetched HTML into a template
    const tpl = document.createElement('template');
    tpl.innerHTML = html;

    // Move all non-script nodes into the target element
    const fragment = document.createDocumentFragment();
    Array.from(tpl.content.childNodes).forEach(node => {
      if (node.tagName && node.tagName.toLowerCase() === 'script') return;
      fragment.appendChild(node.cloneNode(true));
    });
    el.appendChild(fragment);

    // Execute scripts in order (supports inline and external)
    const scripts = Array.from(tpl.content.querySelectorAll('script'));
    for (const s of scripts) {
      await runScript(s, el);
    }
  } catch (err) {
    console.error(err);
    el.innerHTML = `<!-- error loading ${path} -->`;
  }
}

function runScript(oldScript, parent) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');

    // copy attributes (type, src, async, defer, etc.)
    Array.from(oldScript.attributes).forEach(a => script.setAttribute(a.name, a.value));

    if (oldScript.src) {
      // external script — wait for load
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script ${oldScript.src}`));
      script.src = oldScript.src;
      parent.appendChild(script);
    } else {
      // inline script — execute immediately
      script.textContent = oldScript.textContent;
      parent.appendChild(script);
      resolve();
    }
  });
}

