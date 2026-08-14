(function() {
  const toggle  = document.getElementById('navToggle');
  const links   = document.getElementById('navLinks');
  const overlay = document.getElementById('navOverlay');

  if (!toggle || !links) return;

  function closeMenu() {
    links.classList.remove('open');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
    if (overlay) overlay.classList.remove('visible');
  }

  function openMenu() {
    links.classList.add('open');
    toggle.classList.add('active');
    toggle.setAttribute('aria-expanded', 'true');
    if (overlay) overlay.classList.add('visible');
  }

  toggle.addEventListener('click', function() {
    if (links.classList.contains('open')) closeMenu(); else openMenu();
  });

  links.querySelectorAll('a').forEach(function(a) {
    a.addEventListener('click', closeMenu);
  });

  if (overlay) overlay.addEventListener('click', closeMenu);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeMenu();
  });
})();
