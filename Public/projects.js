// Portfolio text rotator ("The Build. / The Design. / The Work.")
(() => {
  const rotatorInner = document.querySelector('.portfolio-rotator__inner');
  if (!rotatorInner) return;

  const items = Array.from(rotatorInner.querySelectorAll('span'));
  if (items.length === 0) return;

  let index = 0;

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

  applyClasses();

  setInterval(() => {
    index = (index + 1) % items.length;
    applyClasses();
  }, 1500);
})();
