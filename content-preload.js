'use strict';
// Runs inside Proton Mail (main frame + iframes). Injects the modern scrollbar.
const css = `
* { scrollbar-width: auto !important; scrollbar-color: auto !important; }
::-webkit-scrollbar { width: 14px; height: 14px; background: transparent; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-corner { background: transparent; }
::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
::-webkit-scrollbar-thumb {
  background-color: #706d7b;
  border: 4px solid transparent;      /* 14px - 2*4px = 6px slim pill */
  background-clip: padding-box;
  border-radius: 999px;
  min-height: 40px;
}
::-webkit-scrollbar-thumb:hover  { background-color: #8b8899; }
::-webkit-scrollbar-thumb:active { background-color: #a6a3b3; }
`;

function inject() {
  try {
    if (document.getElementById('pmd-scrollbar')) return;
    const s = document.createElement('style');
    s.id = 'pmd-scrollbar';
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  } catch { /* ignore */ }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inject, { once: true });
} else {
  inject();
}
