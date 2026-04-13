(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReducedMotion) return;
  
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  
    function tweenPlaybackRate(trackEl, targetRate, duration = 220) {
      const anim = trackEl.getAnimations?.()[0];
      if (!anim) return;
  
      const startRate = anim.playbackRate ?? 1;
      const start = performance.now();
  
      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        anim.playbackRate = lerp(startRate, targetRate, easeOutCubic(t));
        if (t < 1) requestAnimationFrame(tick);
      }
  
      requestAnimationFrame(tick);
    }
  
    document.querySelectorAll('.marquee .marquee__track').forEach((track) => {
      const parent = track.closest('.marquee');
      if (!parent) return;
  
      parent.addEventListener('mouseenter', () => tweenPlaybackRate(track, 0.5));
      parent.addEventListener('mouseleave', () => tweenPlaybackRate(track, 1));
      parent.addEventListener('focusin', () => tweenPlaybackRate(track, 0.5));
      parent.addEventListener('focusout', () => tweenPlaybackRate(track, 1));
    });
  
    // Image "liquid spotlight" reveal (wobbly blob around pointer)
    const imageWrap = document.querySelector('.image');
    if (imageWrap) {
      let rafId = null;
      let targetX = null;
      let targetY = null;
      let curX = 50;
      let curY = 50;
  
      const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  
      const apply = () => {
        rafId = null;
        if (targetX == null || targetY == null) return;
        const ease = 0.18;
        curX += (targetX - curX) * ease;
        curY += (targetY - curY) * ease;
        const x = curX;
        const y = curY;
  
        imageWrap.style.setProperty('--reveal-x', `${x}%`);
        imageWrap.style.setProperty('--reveal-y', `${y}%`);
  
        // Gentle wobble from cursor position so the blob morphs smoothly.
        const t = (x * 0.45 + y * 0.65) * 0.08;
        const wob = (f, p = 0) => Math.sin(t * f + p);
        const wob2 = (f, p = 0) => Math.cos(t * f + p);
  
        const b1x = clamp(x + wob(1.3, 0.4) * 4 + wob2(2.1, 1.2) * 2, 0, 100);
        const b1y = clamp(y + wob2(1.4, 0.9) * 4 + wob(2.0, 2.3) * 2, 0, 100);
        const b2x = clamp(x + wob(1.0, 2.0) * -5 + wob2(1.8, 0.7) * 2, 0, 100);
        const b2y = clamp(y + wob2(1.1, 1.6) * 3 + wob(2.4, 0.2) * -2, 0, 100);
        const b3x = clamp(x + wob(1.7, 1.1) * 3 + wob2(2.4, 2.2) * -2, 0, 100);
        const b3y = clamp(y + wob2(1.6, 0.3) * 5 + wob(2.2, 1.7) * 2, 0, 100);
        const b4x = clamp(x + wob(1.5, 2.6) * -4 + wob2(2.0, 0.1) * 3, 0, 100);
        const b4y = clamp(y + wob2(1.7, 1.9) * -5 + wob(2.5, 0.8) * 2, 0, 100);
  
        const b1r = clamp(0.55 + wob(1.5, 0.0) * 0.06 + wob2(2.2, 1.2) * 0.04, 0.4, 0.75);
        const b2r = clamp(0.48 + wob(1.7, 2.4) * 0.06 + wob2(2.5, 0.4) * 0.04, 0.35, 0.7);
        const b3r = clamp(0.40 + wob(1.9, 0.8) * 0.07 + wob2(2.0, 2.0) * 0.04, 0.3, 0.65);
        const b4r = clamp(0.34 + wob(2.1, 1.6) * 0.06 + wob2(2.1, 0.9) * 0.04, 0.25, 0.6);
  
        imageWrap.style.setProperty('--b1-x', `${b1x}%`);
        imageWrap.style.setProperty('--b1-y', `${b1y}%`);
        imageWrap.style.setProperty('--b1-r', `${b1r}`);
        imageWrap.style.setProperty('--b2-x', `${b2x}%`);
        imageWrap.style.setProperty('--b2-y', `${b2y}%`);
        imageWrap.style.setProperty('--b2-r', `${b2r}`);
        imageWrap.style.setProperty('--b3-x', `${b3x}%`);
        imageWrap.style.setProperty('--b3-y', `${b3y}%`);
        imageWrap.style.setProperty('--b3-r', `${b3r}`);
        imageWrap.style.setProperty('--b4-x', `${b4x}%`);
        imageWrap.style.setProperty('--b4-y', `${b4y}%`);
        imageWrap.style.setProperty('--b4-r', `${b4r}`);
      };
  
      const updateFromEvent = (e) => {
        const rect = imageWrap.getBoundingClientRect();
        targetX = ((e.clientX - rect.left) / rect.width) * 100;
        targetY = ((e.clientY - rect.top) / rect.height) * 100;
        if (rafId == null) rafId = requestAnimationFrame(apply);
      };
  
      imageWrap.addEventListener('pointerenter', (e) => {
        imageWrap.classList.add('is-revealing');
        updateFromEvent(e);
      });
      imageWrap.addEventListener('pointermove', updateFromEvent);
      imageWrap.addEventListener('pointerleave', () => {
        imageWrap.classList.remove('is-revealing');
        targetX = null;
        targetY = null;
      });
    }
  
    // Scroll-driven sentence highlight in ".me"
    const meSection = document.querySelector('.me');
    if (meSection) {
      const p = meSection.querySelector('p');
      const sentences = p ? Array.from(p.querySelectorAll('[data-sentence]')) : [];
      const total = sentences.length;
      if (total > 0) {
        const clamp01 = (v) => Math.min(1, Math.max(0, v));
  
        const updateHighlight = () => {
          const sectionTop = meSection.offsetTop;
          const sectionHeight = meSection.offsetHeight;
          const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
          const scrollY = window.scrollY || window.pageYOffset || 0;
  
          const progressRaw = (scrollY - sectionTop) / (sectionHeight - viewportHeight);
          const progress = clamp01(progressRaw);
  
          // Make the last frame linger longer near the bottom.
          const lastStart = 0.7; // bottom 30% of scroll is locked on last sentence
          let activeIndex;
          if (progress >= lastStart) {
            activeIndex = total - 1;
          } else {
            const scaled = progress / lastStart; // rescale 0..lastStart → 0..1
            const frameFloat = scaled * (total - 1);
            activeIndex = Math.round(frameFloat);
          }
  
          sentences.forEach((el, idx) => {
            const isActive = idx === activeIndex;
            el.style.color = isActive ? '#FFFFFF' : '#474747';
          });
        };
  
        window.addEventListener('scroll', updateHighlight, { passive: true });
        updateHighlight();
      }
    }
  
  })();
  
  // Portfolio text rotator ("The Build. / The Design. / The Work.")
  (() => {
    const rotatorInner = document.querySelector('.portfolio-rotator__inner');
    if (!rotatorInner) return;
  
    const items = Array.from(rotatorInner.querySelectorAll('span'));
    if (items.length === 0) return;
  
    let index = 0; // index of the currently active item
  
    const applyClasses = () => {
      const total = items.length;
      const leavingIndex = index;
      const activeIndex = (index + 1) % total;
      const chilsIndex = (index + 2) % total;
  
      items.forEach((el, i) => {
        el.classList.remove('chils', 'active', 'leaving');
        if (i === leavingIndex) {
          el.classList.add('leaving');
        } else if (i === activeIndex) {
          el.classList.add('active');
        } else if (i === chilsIndex) {
          el.classList.add('chils');
        }
      });
    };
  
    // initial state: first is active, second is chils, third is leaving
    applyClasses();
  
    setInterval(() => {
      // advance the cycle
      index = (index + 1) % items.length;
      applyClasses();
    }, 1500);
  })();
  
  const dots = document.querySelectorAll('.exp-dot');
   
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          } else {
            entry.target.classList.remove('in-view');
          }
        });
      }, { threshold: 1.0 });
   
      dots.forEach(dot => observer.observe(dot));
  
// ─── Home contact form ────────────────────────────────
const homeForm = document.getElementById('contactForm');
const homeBtn  = document.getElementById('submitBtn');
const homeErr  = document.getElementById('errorMsg');
const typeSelect = document.getElementById('type');
const companyField = document.getElementById('companyField');

if (typeSelect) {
  typeSelect.addEventListener('change', () => {
    if (typeSelect.value === 'company') {
      companyField.classList.add('visible');
      document.getElementById('company').required = true;
    } else {
      companyField.classList.remove('visible');
      document.getElementById('company').required = false;
    }
  });
}

if (homeForm) {
  homeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    homeBtn.disabled = true;
    homeBtn.textContent = 'Sending…';
    homeErr.style.display = 'none';

    const data = new FormData(homeForm);

    try {
      await fetch('http://localhost:3003/home-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data).toString()
      });

      homeBtn.textContent = 'Sent ✓';
homeForm.reset();

const popup = document.createElement('div');
popup.style.cssText = `
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #111;
  border: 0.5px solid #E0002A;
  border-radius: 16px;
  padding: 40px 48px;
  text-align: center;
  z-index: 9999;
  box-shadow: 0 0 20px rgba(224,0,42,0.15);
  animation: fadeIn 0.3s ease;
`;
popup.innerHTML = `
  <p style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#E0002A;margin-bottom:12px;">Message received</p>
  <h2 style="font-size:24px;font-weight:500;color:#fff;margin-bottom:12px;">I'll get back to you soon.</h2>
  <p style="font-size:14px;color:#777;">You'll hear from me directly — usually within 24 hours.</p>
`;
document.body.appendChild(popup);

setTimeout(() => {
  popup.style.transition = 'opacity 1.0s ease';
  popup.style.opacity = '0';
  setTimeout(() => popup.remove(), 500);
  homeBtn.disabled = false;
  homeBtn.textContent = 'Send message →';
}, 4000);
    } catch (e) {
      homeErr.textContent = 'Something went wrong. Please try again.';
      homeErr.style.display = 'block';
      homeBtn.disabled = false;
      homeBtn.textContent = 'Send message →';
    }
  });
}

