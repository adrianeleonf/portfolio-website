(function() {
  // "All Projects" is a cross-page link (project page -> homepage), so
  // anchor-scroll.js's same-page hash interception can't help here. This
  // carries the scroll intent across the navigation via sessionStorage
  // instead of a URL hash, then consumes it on the homepage with the same
  // hash-free smooth scroll anchor-scroll.js uses for in-page nav.
  document.querySelectorAll('.nav-back').forEach(function(link) {
    link.addEventListener('click', function() {
      sessionStorage.setItem('scrollToWork', '1');
    });
  });

  const target = document.getElementById('work');
  if (target && sessionStorage.getItem('scrollToWork')) {
    sessionStorage.removeItem('scrollToWork');
    requestAnimationFrame(function() {
      target.scrollIntoView({ behavior: 'smooth' });
    });
  }
})();
