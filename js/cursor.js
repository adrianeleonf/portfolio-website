(function() {
  const dot  = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');

  document.addEventListener('mousemove', function(e) {
    dot.style.left  = e.clientX + 'px';
    dot.style.top   = e.clientY + 'px';
    ring.style.left = e.clientX + 'px';
    ring.style.top  = e.clientY + 'px';
  });

  document.querySelectorAll('a, button, .carousel-slide, .portfolio-item').forEach(function(el) {
    el.addEventListener('mouseenter', function() {
      ring.style.width   = '50px';
      ring.style.height  = '50px';
      ring.style.opacity = '0.8';
    });
    el.addEventListener('mouseleave', function() {
      ring.style.width   = '28px';
      ring.style.height  = '28px';
      ring.style.opacity = '0.5';
    });
  });

  /* mousemove never reaches this document while the pointer is over a
     cross-origin iframe (e.g. an embedded YouTube player), so the custom
     cursor would otherwise freeze at the last position before entering it.
     mouseleave/mouseenter on <html> don't bubble, so they fire exactly at
     that boundary without disrupting the per-element hover states above. */
  document.documentElement.addEventListener('mouseleave', function() {
    dot.style.opacity  = '0';
    ring.style.opacity = '0';
  });
  document.documentElement.addEventListener('mouseenter', function() {
    dot.style.opacity  = '1';
    ring.style.opacity = '0.5';
  });
})();
