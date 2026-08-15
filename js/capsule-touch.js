(function() {
  const capsule = document.querySelector('.project-capsule');
  const shell = document.querySelector('.capsule-shell');
  if (!capsule || !shell) return;

  const MOBILE_QUERY = '(max-width: 900px)';

  /* Hover expands the capsule on desktop, but there's no reliable hover
     on touch — so on mobile the first tap expands it instead of
     navigating, and a second tap on a thumbnail navigates normally. */
  shell.addEventListener('click', function(e) {
    if (!window.matchMedia(MOBILE_QUERY).matches) return;
    if (!capsule.classList.contains('expanded')) {
      e.preventDefault();
      capsule.classList.add('expanded');
    }
  });

  document.addEventListener('click', function(e) {
    if (!window.matchMedia(MOBILE_QUERY).matches) return;
    if (capsule.classList.contains('expanded') && !capsule.contains(e.target)) {
      capsule.classList.remove('expanded');
    }
  });
})();
