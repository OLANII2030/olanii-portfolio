// ── Staggered fade-up on scroll ──
const anims = document.querySelectorAll('.anim');
 
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const delay = parseFloat(el.dataset.delay || 0);
      setTimeout(() => el.classList.add('visible'), delay);
      fadeObserver.unobserve(el);
    }
  });
}, { threshold: 0.15 });

anims.forEach((el, i) => {
  el.dataset.delay = i * 80;
  fadeObserver.observe(el);
});

// ── Stat counter animation ──
const statItems = document.querySelectorAll('.stat-item[data-target]');

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;

    const item    = entry.target;
    const el      = item.querySelector('.stat-number');
    const target  = parseFloat(item.dataset.target);
    const decimal = item.dataset.decimal === 'true';
    const suffix  = item.dataset.suffix || '';
    const duration = 1000;
    const start = performance.now();

    function tick(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = target * eased;
      const display  = decimal ? current.toFixed(1) : Math.round(current);

      if (suffix) {
        el.innerHTML = display + '<span>' + suffix + '</span>';
      } else {
        el.textContent = display;
      }

      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
    countObserver.unobserve(item);
  });
}, { threshold: 0.5 });

statItems.forEach(el => countObserver.observe(el));