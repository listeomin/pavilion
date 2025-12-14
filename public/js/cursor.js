export function initCursor() {
  const cursor = document.querySelector('.cursor');
  if (!cursor) return;
  console.log('cursor init', cursor);

  // touch — сразу выходим
  if ('ontouchstart' in window) {
    cursor.remove();
    return;
  }

  let mouseX = 0;
  let mouseY = 0;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function render() {
    cursor.style.transform =
      `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    requestAnimationFrame(render);
  }

  render();

  // hover
  document.querySelectorAll('a, button, [data-cursor]').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('is-hover');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('is-hover');
    });
  });
}
