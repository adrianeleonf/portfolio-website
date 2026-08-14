(function() {
  const lightbox         = document.getElementById('lightbox');
  const lightboxImg      = document.getElementById('lightboxImg');
  const lightboxCaption  = document.getElementById('lightboxCaption');
  const lightboxCounter  = document.getElementById('lightboxCounter');
  const lightboxClose    = document.getElementById('lightboxClose');
  const lightboxPrev     = document.getElementById('lightboxPrev');
  const lightboxNext     = document.getElementById('lightboxNext');
  const lightboxZoomIn   = document.getElementById('lightboxZoomIn');
  const lightboxZoomOut  = document.getElementById('lightboxZoomOut');
  const lightboxZoomLevel = document.getElementById('lightboxZoomLevel');

  let activeItems = [];
  let activeIndex = 0;

  // ── Zoom / pan state ──
  const MIN_ZOOM = 1, MAX_ZOOM = 4, ZOOM_STEP = 0.5;
  let zoom = 1, panX = 0, panY = 0;
  let isPanning = false, panStartX = 0, panStartY = 0, panOriginX = 0, panOriginY = 0;

  function applyZoom() {
    lightboxImg.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoom + ')';
    lightboxImg.classList.toggle('zoomed', zoom > 1);
    lightboxZoomLevel.textContent = Math.round(zoom * 100) + '%';
  }

  function clampPan() {
    const baseW = lightboxImg.offsetWidth;
    const baseH = lightboxImg.offsetHeight;
    const maxX = Math.max(0, baseW * (zoom - 1) / 2);
    const maxY = Math.max(0, baseH * (zoom - 1) / 2);
    panX = Math.min(maxX, Math.max(-maxX, panX));
    panY = Math.min(maxY, Math.max(-maxY, panY));
  }

  function setZoom(newZoom) {
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    if (zoom === 1) { panX = 0; panY = 0; }
    clampPan();
    applyZoom();
  }

  function resetZoom() {
    zoom = 1; panX = 0; panY = 0;
    lightboxImg.classList.remove('dragging');
    applyZoom();
  }

  function updateLightbox() {
    const item = activeItems[activeIndex];
    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt;
    lightboxCaption.textContent = item.caption;
    lightboxCounter.textContent = String(activeIndex + 1).padStart(2, '0') + ' / ' + String(activeItems.length).padStart(2, '0');
    resetZoom();
  }

  function openLightbox(items, index) {
    activeItems = items;
    activeIndex = index;
    updateLightbox();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    resetZoom();
  }

  function lightboxGo(delta) {
    activeIndex = (activeIndex + delta + activeItems.length) % activeItems.length;
    updateLightbox();
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', function() { lightboxGo(-1); });
  lightboxNext.addEventListener('click', function() { lightboxGo(1); });
  lightbox.addEventListener('click', function(e) { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', function(e) {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  lightboxGo(-1);
    if (e.key === 'ArrowRight') lightboxGo(1);
    if (e.key === '+' || e.key === '=') setZoom(zoom + ZOOM_STEP);
    if (e.key === '-' || e.key === '_') setZoom(zoom - ZOOM_STEP);
    if (e.key === '0') resetZoom();
  });

  lightboxZoomIn.addEventListener('click', function() { setZoom(zoom + ZOOM_STEP); });
  lightboxZoomOut.addEventListener('click', function() { setZoom(zoom - ZOOM_STEP); });
  lightboxZoomLevel.addEventListener('click', resetZoom);

  // Scroll wheel zoom (anywhere over the lightbox)
  lightbox.addEventListener('wheel', function(e) {
    if (!lightbox.classList.contains('active')) return;
    e.preventDefault();
    setZoom(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  }, { passive: false });

  // Double-click to toggle zoom
  lightboxImg.addEventListener('dblclick', function() {
    setZoom(zoom > 1 ? 1 : 2.5);
  });
  lightboxImg.addEventListener('dragstart', function(e) { e.preventDefault(); });

  // Drag to pan (mouse) — only while zoomed in
  lightboxImg.addEventListener('mousedown', function(e) {
    if (zoom <= 1) return;
    isPanning = true;
    panStartX = e.clientX; panStartY = e.clientY;
    panOriginX = panX; panOriginY = panY;
    lightboxImg.classList.add('dragging');
    e.preventDefault();
  });
  window.addEventListener('mousemove', function(e) {
    if (!isPanning) return;
    panX = panOriginX + (e.clientX - panStartX);
    panY = panOriginY + (e.clientY - panStartY);
    clampPan();
    applyZoom();
  });
  window.addEventListener('mouseup', function() {
    if (!isPanning) return;
    isPanning = false;
    lightboxImg.classList.remove('dragging');
  });

  // Pinch to zoom + single-finger pan (touch)
  let touchStartDist = 0, touchStartZoom = 1;
  let touchPanning = false, touchStartX = 0, touchStartY = 0, touchOriginX = 0, touchOriginY = 0;

  function touchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  lightboxImg.addEventListener('touchstart', function(e) {
    if (e.touches.length === 2) {
      touchStartDist = touchDist(e.touches);
      touchStartZoom = zoom;
      touchPanning = false;
    } else if (e.touches.length === 1 && zoom > 1) {
      touchPanning = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchOriginX = panX;
      touchOriginY = panY;
    }
  }, { passive: true });

  lightboxImg.addEventListener('touchmove', function(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      setZoom(touchStartZoom * (touchDist(e.touches) / touchStartDist));
    } else if (touchPanning && e.touches.length === 1) {
      e.preventDefault();
      panX = touchOriginX + (e.touches[0].clientX - touchStartX);
      panY = touchOriginY + (e.touches[0].clientY - touchStartY);
      clampPan();
      applyZoom();
    }
  }, { passive: false });

  lightboxImg.addEventListener('touchend', function(e) {
    if (e.touches.length === 0) touchPanning = false;
  });

  document.querySelectorAll('.carousel-outer').forEach(function(carouselOuter) {
    const track   = carouselOuter.querySelector('.carousel-track');
    const slides  = Array.from(track.querySelectorAll('.carousel-slide'));
    const prevBtn = carouselOuter.querySelector('.carousel-btn.prev');
    const nextBtn = carouselOuter.querySelector('.carousel-btn.next');
    const dotsEl  = carouselOuter.querySelector('.carousel-dots');
    const counterCurrent = carouselOuter.querySelector('.counter-current');
    const counterTotal   = carouselOuter.querySelector('.counter-total');

    const total = slides.length;
    let current = 0;
    if (!total) return;

    counterTotal.textContent = String(total).padStart(2, '0');

    // Build dots
    const dots = [];
    for (let i = 0; i < total; i++) {
      const d = document.createElement('button');
      d.className = 'dot' + (i === 0 ? ' active' : '');
      d.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      d.addEventListener('click', function() { goTo(i); });
      dotsEl.appendChild(d);
      dots.push(d);
    }

    function goTo(idx) {
      current = (idx + total) % total;
      track.style.transform = 'translateX(-' + (current * 100) + '%)';
      dots.forEach(function(d, i) {
        d.classList.toggle('active', i === current);
      });
      counterCurrent.textContent = String(current + 1).padStart(2, '0');
    }

    prevBtn.addEventListener('click', function() { goTo(current - 1); });
    nextBtn.addEventListener('click', function() { goTo(current + 1); });

    // Touch / drag swipe
    let startX = 0, isDragging = false, suppressClick = false;

    track.addEventListener('mousedown',  function(e) { startX = e.clientX; isDragging = true; });
    track.addEventListener('touchstart', function(e) { startX = e.touches[0].clientX; isDragging = true; }, { passive: true });

    track.addEventListener('mouseup', function(e) {
      if (!isDragging) return;
      isDragging = false;
      carouselOuter.classList.add('dragged');
      const diff = e.clientX - startX;
      if (Math.abs(diff) > 5)  suppressClick = true;
      if (Math.abs(diff) > 60) diff < 0 ? goTo(current + 1) : goTo(current - 1);
    });
    track.addEventListener('touchend', function(e) {
      if (!isDragging) return;
      isDragging = false;
      carouselOuter.classList.add('dragged');
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 5)  suppressClick = true;
      if (Math.abs(diff) > 60) diff < 0 ? goTo(current + 1) : goTo(current - 1);
    });

    // Prevent image drag
    track.querySelectorAll('img').forEach(function(img) {
      img.addEventListener('dragstart', function(e) { e.preventDefault(); });
    });

    // Lightbox — only plain images open fullscreen (video/iframe slides are skipped)
    const imgs  = slides.map(function(slide) { return slide.querySelector('img'); }).filter(Boolean);
    const items = imgs.map(function(img) {
      const caption = img.closest('.carousel-slide').querySelector('.slide-caption');
      return { src: img.src, alt: img.alt, caption: caption ? caption.textContent : '' };
    });

    imgs.forEach(function(img, i) {
      img.addEventListener('click', function() {
        if (suppressClick) { suppressClick = false; return; }
        openLightbox(items, i);
      });
    });
  });
})();
