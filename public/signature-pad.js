function createSignaturePad(canvas) {
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let hasStrokes = false;
  let lastPoint = null;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const prev = hasStrokes ? canvas.toDataURL('image/png') : null;

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#14213d';

    if (prev) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = prev;
    }
  }

  function getPoint(evt) {
    const rect = canvas.getBoundingClientRect();
    const x = (evt.touches ? evt.touches[0].clientX : evt.clientX) - rect.left;
    const y = (evt.touches ? evt.touches[0].clientY : evt.clientY) - rect.top;
    return { x, y };
  }

  function start(evt) {
    evt.preventDefault();
    drawing = true;
    lastPoint = getPoint(evt);
  }

  function move(evt) {
    if (!drawing) return;
    evt.preventDefault();
    const point = getPoint(evt);
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint = point;
    hasStrokes = true;
  }

  function end(evt) {
    if (evt) evt.preventDefault();
    drawing = false;
    lastPoint = null;
  }

  canvas.addEventListener('pointerdown', start);
  canvas.addEventListener('pointermove', move);
  window.addEventListener('pointerup', end);
  canvas.addEventListener('pointerleave', end);

  window.addEventListener('resize', resize);
  resize();

  return {
    isEmpty: () => !hasStrokes,
    clear: () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      hasStrokes = false;
    },
    toDataURL: () => canvas.toDataURL('image/png'),
  };
}
