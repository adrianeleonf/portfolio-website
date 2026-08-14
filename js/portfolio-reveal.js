(function() {
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        const siblings = e.target.parentElement.querySelectorAll('.reveal');
        siblings.forEach(function(el, i) {
          setTimeout(function() { el.classList.add('visible'); }, i * 100);
        });
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(function(el) { observer.observe(el); });
})();
