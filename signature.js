(function () {
  'use strict';

  var trace = document.querySelector('[data-visit-trace]');
  var peak = document.querySelector('#visit-path');
  var path = trace && trace.querySelector('[data-trace-path]');
  var marker = trace && trace.querySelector('[data-trace-marker]');
  var nodes = peak ? Array.prototype.slice.call(peak.querySelectorAll('[data-trace-node]')) : [];
  var dots = trace ? Array.prototype.slice.call(trace.querySelectorAll('[data-trace-dot]')) : [];
  var scrollTitles = Array.prototype.slice.call(document.querySelectorAll('[data-scroll-title]'));
  var stagedElements = Array.prototype.slice.call(document.querySelectorAll('[data-scroll-stage]'));
  var scrollImages = Array.prototype.slice.call(document.querySelectorAll('[data-scroll-image]'));
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var frame = 0;
  var pathLength = 0;

  function smoothProgress(value, start, end) {
    var progress = Math.max(0, Math.min(1, (value - start) / (end - start)));
    return progress * progress * (3 - 2 * progress);
  }

  function actProgress(element) {
    var act = element.closest('[data-sc-act]');
    var progress = act ? parseFloat(getComputedStyle(act).getPropertyValue('--sc-p')) : 0;
    return Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  }

  function rangeFor(element, fallbackStart, fallbackEnd) {
    var values = (element.getAttribute('data-scroll-title') || element.getAttribute('data-scroll-stage') || '')
      .trim().split(/\s+/);
    var start = parseFloat(values[0]);
    var end = parseFloat(values[1]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return [fallbackStart, fallbackEnd];
    }
    return [Math.max(0, Math.min(1, start)), Math.max(0, Math.min(1, end))];
  }

  function renderScrollEffects() {
    scrollTitles.forEach(function (title) {
      var progress = actProgress(title);
      var range = rangeFor(title, 0.04, 0.32);
      var reveal = reducedMotion.matches ? 1 : smoothProgress(progress, range[0], range[1]);
      title.style.setProperty('--scroll-title-y', ((1 - reveal) * 18).toFixed(2) + 'px');
      title.style.setProperty('--scroll-title-rule', reveal.toFixed(3));
    });

    stagedElements.forEach(function (element) {
      var progress = actProgress(element);
      var range = rangeFor(element, 0.08, 0.3);
      var reveal = reducedMotion.matches ? 1 : smoothProgress(progress, range[0], range[1]);
      element.style.setProperty('--scroll-stage-y', ((1 - reveal) * 28).toFixed(2) + 'px');
    });

    scrollImages.forEach(function (image) {
      var progress = actProgress(image);
      var depth = parseFloat(image.getAttribute('data-image-depth'));
      if (!Number.isFinite(depth)) depth = 1;
      var offset = reducedMotion.matches ? 0 : (0.5 - progress) * 72 * depth;
      var scale = reducedMotion.matches ? 1 : 1.1 - progress * 0.04;
      image.style.setProperty('--scroll-photo-y', offset.toFixed(2) + 'px');
      image.style.setProperty('--scroll-photo-scale', scale.toFixed(3));
    });
  }

  if (path && peak) {
    pathLength = path.getTotalLength();

    function renderTrace() {
      frame = 0;
      var progress = parseFloat(getComputedStyle(peak).getPropertyValue('--sc-p'));
      if (!Number.isFinite(progress)) progress = 0;
      progress = Math.max(0, Math.min(1, progress));
      renderScrollEffects();

      trace.setAttribute('data-sc-verify-state', progress.toFixed(3));

      nodes.forEach(function (node, index) {
        var threshold = parseFloat(node.getAttribute('data-trace-at'));
        if (!Number.isFinite(threshold)) threshold = index / Math.max(nodes.length - 1, 1);
        var revealStart = Math.max(0, threshold - 0.18);
        var revealEnd = Math.min(1, threshold + 0.08);
        var reveal = reducedMotion.matches ? 1 : smoothProgress(progress, revealStart, revealEnd);
        var active = progress >= threshold;
        node.style.setProperty('--trace-step-scale', String((0.72 + reveal * 0.38).toFixed(3)));
        node.setAttribute('data-trace-active', String(active));
      });

      dots.forEach(function (dot, index) {
        var threshold = nodes[index] ? parseFloat(nodes[index].getAttribute('data-trace-at')) : index / Math.max(dots.length - 1, 1);
        var revealStart = Math.max(0, threshold - 0.12);
        var reveal = reducedMotion.matches ? 1 : smoothProgress(progress, revealStart, threshold);
        dot.style.setProperty('--trace-dot-scale', String((0.68 + reveal * 0.5).toFixed(3)));
        dot.setAttribute('data-trace-active', String(progress >= threshold));
      });

      if (marker) {
        var point = path.getPointAtLength(pathLength * (reducedMotion.matches ? 1 : progress));
        marker.setAttribute('cx', point.x.toFixed(2));
        marker.setAttribute('cy', point.y.toFixed(2));
      }
    }

    function scheduleTrace() {
      if (!frame) frame = requestAnimationFrame(renderTrace);
    }

    window.addEventListener('scroll', scheduleTrace, { passive: true });
    window.addEventListener('resize', scheduleTrace, { passive: true });
    if (typeof reducedMotion.addEventListener === 'function') {
      reducedMotion.addEventListener('change', scheduleTrace);
    } else if (typeof reducedMotion.addListener === 'function') {
      reducedMotion.addListener(scheduleTrace);
    }
    scheduleTrace();
  }

  var links = Array.prototype.slice.call(document.querySelectorAll('[data-folio-link]'));
  var chapters = links.map(function (link) {
    return document.querySelector(link.getAttribute('href'));
  }).filter(Boolean);

  function setCurrentChapter(chapter) {
    links.forEach(function (link) {
      if (document.querySelector(link.getAttribute('href')) === chapter) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  if ('IntersectionObserver' in window && chapters.length) {
    var chapterObserver = new IntersectionObserver(function (entries) {
      var visible = entries.filter(function (entry) { return entry.isIntersecting; });
      if (!visible.length) return;
      visible.sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });
      setCurrentChapter(visible[0].target);
    }, { rootMargin: '-42% 0px -42% 0px', threshold: [0, 0.01, 0.1] });

    chapters.forEach(function (chapter) { chapterObserver.observe(chapter); });
  }
})();
