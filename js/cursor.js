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
})();
