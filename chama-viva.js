/* Chama viva — anima a chama da foto da capa como uma vela acesa de verdade.
   A chama original da foto é recortada e ganha movimento suave e irregular
   (oscilação, alongamento e inclinação), com o brilho da cena acompanhando. */
(function () {
  var NAT_W = 1200, NAT_H = 1800;                 // tamanho da foto original
  var FLAME = { cx: 817, base: 774, top: 632 };   // chama na foto original (px)
  var PATCH = { x: 786, y: 618, w: 62, h: 162 };  // recorte que contém a chama
  var COVER = { x: 793, y: 616, w: 48, h: 150 };  // área que esconde a chama parada

  function noise(seed) {
    var pts = [], i;
    for (i = 0; i < 256; i++) pts.push(Math.sin((i + 1) * 12.9898 * seed) * 43758.5453 % 1);
    return function (t) {
      var i0 = Math.floor(t), f = t - i0, a = pts[i0 & 255], b = pts[(i0 + 1) & 255];
      var u = (1 - Math.cos(f * Math.PI)) / 2;
      return a * (1 - u) + b * u;                  // -1..1, suave
    };
  }
  var nA = noise(1.7), nB = noise(3.1), nC = noise(5.3), nD = noise(7.9);

  function setup(box, img) {
    var cover = document.createElement('div');
    var patch = document.createElement('div');
    var glow = document.createElement('div');
    [cover, patch, glow].forEach(function (el) {
      el.setAttribute('aria-hidden', 'true');
      el.style.position = 'absolute';
      el.style.pointerEvents = 'none';
      el.style.willChange = 'transform, opacity';
    });
    cover.style.background =
      'linear-gradient(180deg, rgb(204,152,120) 0%, rgb(204,154,121) 72%, rgb(236,182,138) 100%)';
    var coverMask = 'radial-gradient(ellipse 50% 50% at 50% 52%, #000 62%, transparent 100%)';
    cover.style.webkitMaskImage = coverMask; cover.style.maskImage = coverMask;

    var patchMask = 'radial-gradient(ellipse 46% 50% at 50% 60%, #000 45%, transparent 100%)';
    patch.style.webkitMaskImage = patchMask; patch.style.maskImage = patchMask;
    patch.style.backgroundRepeat = 'no-repeat';

    glow.style.borderRadius = '50%';
    glow.style.background =
      'radial-gradient(circle, rgba(255,196,120,.55) 0%, rgba(255,160,80,.18) 38%, rgba(255,140,60,0) 70%)';
    glow.style.mixBlendMode = 'screen';

    img.insertAdjacentElement('afterend', glow);
    img.insertAdjacentElement('afterend', patch);
    img.insertAdjacentElement('afterend', cover);

    var s = 1, ox = 0, oy = 0, glowSize = 0;
    function place(el, r) {
      el.style.left = (ox + r.x * s) + 'px';
      el.style.top = (oy + r.y * s) + 'px';
      el.style.width = (r.w * s) + 'px';
      el.style.height = (r.h * s) + 'px';
    }
    function layout() {
      var W = box.clientWidth, H = box.clientHeight;
      s = Math.max(W / NAT_W, H / NAT_H);
      ox = (W - NAT_W * s) / 2; oy = (H - NAT_H * s) / 2;
      place(cover, COVER);
      place(patch, PATCH);
      patch.style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")';
      patch.style.backgroundSize = (NAT_W * s) + 'px ' + (NAT_H * s) + 'px';
      patch.style.backgroundPosition = (-PATCH.x * s) + 'px ' + (-PATCH.y * s) + 'px';
      var bx = (FLAME.cx - PATCH.x) / PATCH.w * 100, by = (FLAME.base - PATCH.y) / PATCH.h * 100;
      patch.style.transformOrigin = bx + '% ' + by + '%';
      glowSize = 520 * s;
      glow.style.width = glow.style.height = glowSize + 'px';
      glow.style.left = (ox + FLAME.cx * s - glowSize / 2) + 'px';
      glow.style.top = (oy + (FLAME.top + FLAME.base) / 2 * s - glowSize / 2) + 'px';
    }
    layout();
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(box);
    else window.addEventListener('resize', layout);

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var visible = true, start = performance.now(), gust = 0, gustTarget = 0, nextGust = 2;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(box);
    }
    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible) return;
      var t = (now - start) / 1000;
      if (t > nextGust) { gustTarget = (Math.random() - 0.5) * 2; nextGust = t + 1.5 + Math.random() * 3.5; }
      gust += (gustTarget - gust) * 0.02; gustTarget *= 0.985;
      var flick = nA(t * 6.5) * 0.6 + nB(t * 13) * 0.4;            // tremor rápido
      var sway = nC(t * 1.3) * 0.7 + gust * 0.6;                    // balanço lento
      var breath = nD(t * 2.2);                                     // respiração
      var sy = 1 + flick * 0.06 + breath * 0.05;
      var sx = 1 - flick * 0.035 + nB(t * 4) * 0.02;
      var skew = sway * 6;
      var tx = sway * 0.9 * s;
      patch.style.transform =
        'translateX(' + tx.toFixed(2) + 'px) skewX(' + skew.toFixed(2) + 'deg) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ')';
      var light = flick * 0.6 + breath * 0.4;
      glow.style.opacity = (0.55 + light * 0.18).toFixed(3);
      glow.style.transform = 'translateX(' + (tx * 2).toFixed(2) + 'px) scale(' + (1 + light * 0.04).toFixed(3) + ')';
      img.style.filter = 'brightness(' + (1 + light * 0.03).toFixed(3) + ')';
    }
    if (!reduce) requestAnimationFrame(frame);
  }

  function init() {
    var img = document.getElementById('fotoVela');
    if (!img) return;
    var box = img.parentElement;
    if (img.complete && img.naturalWidth) setup(box, img);
    else img.addEventListener('load', function () { setup(box, img); }, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
