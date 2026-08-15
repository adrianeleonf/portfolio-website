(function() {
  const nav = document.querySelector('nav:not(.project-nav)');
  const hero = document.querySelector('#hero, .project-hero');
  if (!nav || !hero) return;

  function updateNav() {
    const heroBottom = hero.getBoundingClientRect().bottom;
    nav.classList.toggle('nav-solid', heroBottom <= nav.offsetHeight);
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();
})();
