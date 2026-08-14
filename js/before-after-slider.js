(function() {
  const wrap    = document.getElementById('beforeAfterWrap');
  const before  = document.getElementById('baBefore');
  const divider = document.getElementById('baDivider');

  if (!wrap) return;

  let dragging = false;
  let pct = 50;

  function setPosition(x) {
    const rect = wrap.getBoundingClientRect();
    pct = Math.min(100, Math.max(0, ((x - rect.left) / rect.width) * 100));
    before.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
    divider.style.left    = pct + '%';
  }

  divider.addEventListener('mousedown',  function(e) { dragging = true; e.preventDefault(); });
  divider.addEventListener('touchstart', function(e) { dragging = true; }, { passive: true });

  document.addEventListener('mousemove', function(e) {
    if (dragging) setPosition(e.clientX);
  });
  document.addEventListener('touchmove', function(e) {
    if (dragging) setPosition(e.touches[0].clientX);
  }, { passive: true });

  document.addEventListener('mouseup',  function() { dragging = false; });
  document.addEventListener('touchend', function() { dragging = false; });

  // Click anywhere on wrap to jump
  wrap.addEventListener('click', function(e) { setPosition(e.clientX); });

  // Init
  setPosition(wrap.getBoundingClientRect().left + wrap.getBoundingClientRect().width * 0.5);
})();
