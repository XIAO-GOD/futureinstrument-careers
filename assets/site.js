(() => {
  "use strict";
  const one = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const byId = id => document.getElementById(id);
  const hero = one(".hero");
  const header = one(".masthead");
  const nav = byId("main-nav");
  const menu = byId("menu-toggle");

  function setMenu(open, restoreFocus = false) {
    menu.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    if (restoreFocus) menu.focus({preventScroll:true});
  }
  menu.hidden = false;
  menu.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  nav.addEventListener("click", e => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("click", e => { if (!header.contains(e.target)) setMenu(false); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) setMenu(false, true);
  });
  matchMedia("(max-width:720px)").addEventListener("change", () => setMenu(false));

  function keyIndex(event, index, length) {
    if (event.key === "ArrowRight") return (index + 1) % length;
    if (event.key === "ArrowLeft") return (index + length - 1) % length;
    if (event.key === "Home") return 0;
    if (event.key === "End") return length - 1;
    return null;
  }
  function writeUrl(method, url) {
    try { history[method](null, "", url); } catch { /* The standalone page still switches panels. */ }
  }
  function enhanceTabs(selector) {
    const list = one(selector);
    const tabs = all("a", list);
    const panels = tabs.map(t => byId(t.hash.slice(1)));
    list.setAttribute("role", "tablist");
    function select(index) {
      tabs.forEach((tab, i) => {
        const active = index === i;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
        panels[i].classList.toggle("is-entering", active);
      });
    }
    function choose(index, method) {
      select(index);
      if (location.hash !== tabs[index].hash) writeUrl(method, tabs[index].href);
    }
    tabs.forEach((tab, i) => {
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panels[i].id);
      panels[i].setAttribute("role", "tabpanel");
      panels[i].tabIndex = 0;
      tab.addEventListener("click", e => {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        choose(i, "pushState");
      });
      tab.addEventListener("keydown", e => {
        const n = keyIndex(e, i, tabs.length);
        if (n === null) return;
        e.preventDefault(); choose(n, "replaceState"); tabs[n].focus({preventScroll:true});
      });
    });
    select(0);
    return {panels, select};
  }

  const careers = enhanceTabs(".job-tabs");
  const controls = one(".hero-controls");
  const picks = all(".slide-select button");
  const slides = picks.map(p => byId(p.getAttribute("aria-controls")));
  let current = 0;

  function showSlide(n, fromControl = false) {
    current = n;
    slides.forEach((slide, i) => {
      const active = n === i;
      slide.hidden = !active;
      slide.classList.toggle("is-entering", active);
      slide.setAttribute("role", "tabpanel");
      picks[i].setAttribute("aria-selected", String(active));
      picks[i].tabIndex = active ? 0 : -1;
    });
    hero.dataset.tone = slides[n].dataset.tone || "dark";
    if (fromControl && (location.hash === "#signal-timing" || slides.some(slide => "#" + slide.id === location.hash))) {
      const detail = slides[n].id === "slide-signal" && !byId("signal-timing").hidden;
      writeUrl("replaceState", new URL("#" + (detail ? "signal-timing" : slides[n].id), location.href));
    }
  }
  picks.forEach((pick, i) => {
    pick.addEventListener("click", () => showSlide(i, true));
    pick.addEventListener("keydown", e => {
      const n = keyIndex(e, i, picks.length);
      if (n === null) return;
      e.preventDefault(); showSlide(n, true); picks[n].focus({preventScroll:true});
    });
  });
  let touch = null;
  const surface=one(".slides");
  surface.addEventListener("touchstart", e => {
    if (e.touches.length!==1 || e.target.closest("button,a")) { touch=null;return; }
    touch=[e.touches[0].clientX,e.touches[0].clientY];
  },{passive:true});
  surface.addEventListener("touchcancel",()=>{touch=null;},{passive:true});
  surface.addEventListener("touchend", e => {
    if (!touch || !e.changedTouches.length) return;
    const dx=e.changedTouches[0].clientX-touch[0],dy=e.changedTouches[0].clientY-touch[1];
    touch=null;
    if (Math.abs(dx)>50 && Math.abs(dx)>Math.abs(dy)*1.7) showSlide((current+(dx<0?1:slides.length-1))%slides.length, true);
  },{passive:true});

  function route() {
    const url = new URL(location.href);
    const legacyGroup = url.searchParams.get("group");
    for(const k of ["group","family","list","q"]) url.searchParams.delete(k);
    if (url.hash === "#recruiter-qr") url.hash="recruitment-contact";
    if (url.hash === "#apply") url.hash="jobs";
    const industryLabel = byId(url.hash.slice(1));
    if (industryLabel?.matches(".industry-labels li")) url.hash = "applications";
    if ((!url.hash || url.hash === "#jobs") && ["tech","business"].includes(legacyGroup)) url.hash="jobs-"+legacyGroup;
    if (url.href!==location.href) writeUrl("replaceState",url);
    const target=byId(url.hash.slice(1));
    if(!target)return;
    const detail = target.id === "signal-timing";
    const slideIndex = slides.indexOf(detail ? byId("slide-signal") : target);
    if (slideIndex >= 0) {
      showSlide(slideIndex);
      if (slides[slideIndex].id === "slide-signal") setTimingView(detail);
      hero.scrollIntoView({behavior:"instant", block:"start"});
      return;
    }
    const group=careers.panels.findIndex(p=>p.contains(target));
    if(group>=0) careers.select(group);
    if(target.matches(".job-row"))target.open=true;
    const anchor = target.matches(".job-panel") ? byId("jobs") : target;
    if(group>=0 || target.id==="recruitment-contact" || target.id==="applications" || target.id==="app-quantum"){
      requestAnimationFrame(()=>{if(byId(location.hash.slice(1))===target)anchor.scrollIntoView({behavior:"instant", block:"start"});});
    }
  }
  window.addEventListener("hashchange",route);
  window.addEventListener("popstate",route);
  const navLinks=all("a",nav);
  function indicateSection() {
    let currentLink=null;
    for(const a of navLinks){
      const section=byId(a.hash.slice(1));
      if(section && section.getBoundingClientRect().top<=header.offsetHeight+90) currentLink=a;
    }
    navLinks.forEach(a=>{if(a===currentLink)a.setAttribute("aria-current","location");else a.removeAttribute("aria-current");});
  }
  let scrollFrame=0;
  function requestNavPaint(){
    if(scrollFrame)return;
    scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;indicateSection();});
  }
  window.addEventListener("scroll",requestNavPaint,{passive:true});
  window.addEventListener("resize",requestNavPaint);

  document.documentElement.classList.add("enhanced");
  controls.hidden=false; showSlide(0);
  if("IntersectionObserver" in window){
    const enter=new IntersectionObserver(entries=>{
      for(const e of entries)if(e.isIntersecting){e.target.classList.add("is-entering");enter.unobserve(e.target);}
    },{threshold:.18});
    all(".section-head,.tech-summary").forEach(el=>enter.observe(el));
  }

  // Original time-domain illustration. Coordinates use a fixed optical viewing angle.
// Phase is measured in turns, so phase 0 and phase 1 have identical geometry.
function createSignalField(canvas) {
  const ctx = canvas.getContext("2d", {alpha: false});
  if (!ctx) return null;
  const width = 960, height = 540;
  const tau = Math.PI * 2;
  const lanes = [
    {height: 239, amplitude: 82, offset: -.17, spread: .46, layers: 12, opacity: .52},
    {height: 311, amplitude: 92, offset: .24, spread: .56, layers: 16, opacity: .66},
    {height: 278, amplitude: 108, offset: .015, spread: .83, layers: 31, opacity: .97}
  ];
  const samples = Array.from({length: 211}, (_, i) => spatial(i / 210));
  const backdrop = document.createElement("canvas");
  backdrop.width = width;
  backdrop.height = height;
  const bg = backdrop.getContext("2d");

  function halo(target, x, y, rx, ry, color, opacity) {
    target.save();
    target.translate(x, y);
    target.scale(rx, ry);
    const light = target.createRadialGradient(0, 0, 0, 0, 0, 1);
    light.addColorStop(0, `rgba(${color},${opacity})`);
    light.addColorStop(.42, `rgba(${color},${opacity * .37})`);
    light.addColorStop(1, `rgba(${color},0)`);
    target.fillStyle = light;
    target.fillRect(-1, -1, 2, 2);
    target.restore();
  }

  const base = bg.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, "#05101c");
  base.addColorStop(.56, "#080f25");
  base.addColorStop(1, "#0c1025");
  bg.fillStyle = base;
  bg.fillRect(0, 0, width, height);
  halo(bg, 302, 299, 397, 231, "20,72,198", .34);
  halo(bg, 543, 253, 320, 220, "60,44,195", .51);
  halo(bg, 499, 265, 184, 130, "46,74,228", .36);
  halo(bg, 770, 246, 173, 147, "119,62,209", .19);
  // A little fixed dithering keeps the dark falloff smooth on compressed posters.
  const noise = document.createElement("canvas");
  noise.width = noise.height = 96;
  const nc = noise.getContext("2d");
  const pixels = nc.createImageData(96, 96);
  let seed = 271828;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = (seed & 256) ? 255 : 0;
    pixels.data[i + 3] = (seed >>> 28) % 5;
  }
  nc.putImageData(pixels, 0, 0);
  bg.fillStyle = bg.createPattern(noise, "repeat");
  bg.fillRect(0, 0, width, height);

  function spectrum(colors) {
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    for (const [position, color] of colors) gradient.addColorStop(position, color);
    return gradient;
  }
  const silk = spectrum([[0,"#214f91"],[.18,"#327ddd"],[.36,"#598bff"],[.53,"#7373ff"],[.71,"#a992ff"],[.85,"#a382ed"],[1,"#72569a"]]);
  const edge = spectrum([[0,"#466fab"],[.20,"#80c5ff"],[.39,"#9fccff"],[.58,"#a8a9ff"],[.72,"#ddc0ff"],[.87,"#cebbff"],[1,"#997eb0"]]);
  const light = spectrum([[0,"#13587b"],[.29,"#339dff"],[.53,"#5146ff"],[.73,"#ad5fff"],[1,"#683c89"]]);

  function spatial(u) {
    const window = Math.sin(Math.PI * u);
    const swell = .61 + .52 * Math.exp(-Math.pow((u - .50) / .32, 2));
    return {
      u, x: -27 + u * 1014, window,
      envelope: .035 + Math.pow(Math.max(0, window), 1.48) * swell,
      theta: tau * (2.74 * u + .64 * u * u) - .59,
      drift: Math.sin(tau * (u * 1.14 - .06)),
      depth: (u - .5) * -62
    };
  }

  function ordinate(point, lane, strand, angle) {
    const twist = lane.spread * strand * (.32 + .90 * point.window);
    const phase = point.theta - angle + lane.offset * tau + twist;
    const carrier = Math.sin(phase) + .105 * Math.sin(2 * phase + .58 + strand * .23);
    return lane.height + point.depth - lane.amplitude * point.envelope * carrier
      + strand * point.window * (14 + 7 * point.drift);
  }
  function trace(lane, strand, angle) {
    const path = new Path2D();
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i], y = ordinate(p, lane, strand, angle);
      if (i === 0) path.moveTo(p.x, y);
      else path.lineTo(p.x, y);
    }
    return path;
  }
  function stroke(path, ink, thickness, opacity) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = thickness;
    ctx.globalAlpha = opacity;
    ctx.stroke(path);
  }

  function ribbon(lane, angle) {
    const near = trace(lane, -1, angle), far = trace(lane, 1, angle);
    const spine = trace(lane, -.04, angle);
    for (const p of [near, far, spine]) {
      stroke(p, light, 15, .045 * lane.opacity);
      stroke(p, light, 6, .12 * lane.opacity);
    }
    for (let i = 0; i < lane.layers; i++) {
      const v = -1 + 2 * i / (lane.layers - 1);
      const glint = .5 + .5 * Math.cos(3.0 * v - .4);
      const contour = i === 0 ? near : i === lane.layers - 1 ? far : trace(lane, v, angle);
      stroke(contour, silk, .75 + .25 * glint, (.22 + .38 * glint) * lane.opacity);
    }
    stroke(far, edge, 1.15, lane.opacity * .68);
    stroke(near, edge, 1.8, lane.opacity * .93);
    stroke(spine, edge, 1.45, lane.opacity * .80);
  }

  function samplingPlane(x, intensity) {
    ctx.save();
    const vertical = ctx.createLinearGradient(0, 47, 0, 473);
    vertical.addColorStop(0, "rgba(146,164,252,0)");
    vertical.addColorStop(.25, "rgba(148,161,255,.38)");
    vertical.addColorStop(.62, "rgba(202,177,255,.68)");
    vertical.addColorStop(1, "rgba(156,158,252,0)");
    ctx.globalAlpha = .45 + .25 * intensity;
    const veil = ctx.createLinearGradient(x - 24, 0, x + 1, 0);
    veil.addColorStop(0,"rgba(124,119,250,0)");
    veil.addColorStop(1,"rgba(148,139,255,.075)");
    ctx.fillStyle = veil;
    ctx.beginPath();
    ctx.moveTo(x - 22, 112); ctx.lineTo(x, 84);
    ctx.lineTo(x, 420); ctx.lineTo(x - 22, 448); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = vertical;
    ctx.lineWidth = .9;
    ctx.beginPath(); ctx.moveTo(x, 49); ctx.lineTo(x, 471); ctx.stroke();
    ctx.restore();
  }
  function excitation(lane, angle, head) {
    const strength = Math.pow(Math.sin(Math.PI * head), 1.35);
    const point = spatial(head), y = ordinate(point, lane, -.04, angle);
    const color = [Math.round(95 + 70 * head), Math.round(175 - 34 * head), 255].join(",");
    ctx.globalAlpha = strength;
    halo(ctx, point.x, y, 76, 57, color, .42);
    const sweep = ctx.createLinearGradient(point.x - 122, 0, point.x + 40, 0);
    sweep.addColorStop(0, "rgba(115,181,255,0)");
    sweep.addColorStop(.40, "rgba(153,194,255,.22)");
    sweep.addColorStop(.72, "rgba(221,223,255,.94)");
    sweep.addColorStop(.84, "rgba(239,242,255,.98)");
    sweep.addColorStop(1, "rgba(151,170,255,0)");
    for (const strand of [-.36, -.04, .26]) {
      const crest = trace(lane, strand, angle);
      stroke(crest, sweep, 7, .19 * strength);
      stroke(crest, sweep, strand === -.04 ? 2.6 : 1.5, strength);
    }
  }
  function sample(x, y, accent, intensity) {
    ctx.globalAlpha = 1;
    halo(ctx, x, y, 14 + 7 * intensity, 14 + 7 * intensity, accent, .30 + .24 * intensity);
    ctx.strokeStyle = `rgba(${accent},${.38 + .34 * intensity})`;
    ctx.lineWidth = .8;
    ctx.beginPath(); ctx.arc(x, y, 4.5 + intensity, 0, tau); ctx.stroke();
    ctx.fillStyle = `rgba(237,238,255,${.83 + .17 * intensity})`;
    ctx.beginPath(); ctx.arc(x, y, 1.75 + .48 * intensity, 0, tau); ctx.fill();
  }

  return function draw(turn) {
    const angle = turn * tau;
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(backdrop, 0, 0);
    const gate = spatial(.695);
    const head = (turn + .675) % 1;
    const pulse = Math.exp(-Math.pow((head - gate.u) / .078, 2));
    samplingPlane(gate.x, pulse);
    ctx.globalCompositeOperation = "screen";
    ctx.lineJoin = ctx.lineCap = "round";
    for (const lane of lanes) ribbon(lane, angle);
    excitation(lanes[2], angle, head);
    for (const [i, lane] of lanes.entries()) {
      sample(gate.x, ordinate(gate, lane, -.04, angle), i === 1 ? "125,178,255" : "192,159,255", pulse);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };
}

  // A triggered sequence, drawn in the plot's CSS coordinates so strokes stay legible on small screens.
function createTimingScope(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx || typeof Path2D !== "function") return null;
  const panel = canvas.closest(".signal-timing");
  const tau = 2 * Math.PI;
  const lanes = [
    {rgb: "111,209,255", start: .025, end: .710, baseline: .50},
    {rgb: "122,168,255", start: .25, end: .74, baseline: .70},
    {rgb: "171,155,255", start: .25, end: .755, baseline: .50},
    {rgb: "224,171,255", start: .775, end: .98, baseline: .69}
  ];
  function taper(x, start, end, fade) {
    const a = Math.max(0, Math.min(1, (x - start) / fade, (end - x) / fade));
    return a * a * (3 - 2 * a);
  }
  function ink(rgb, alpha) { return "rgba(" + rgb + "," + alpha + ")"; }

  return function draw(turn, width, height) {
    if (!width || !height) return;
    const stage = turn < .25 ? "excite" : turn < .76 ? "acquire" : "feedback";
    if (panel && panel.dataset.phase !== stage) panel.dataset.phase = stage;
    const row = height / lanes.length;
    const weight = Math.max(1.35, Math.min(2.25, width / 240));
    const phase = turn * tau;
    const gateStart = .267 + .011 * Math.sin(phase);
    const period = .126, high = period / 2;
    const pulseCenter = .868 + .016 * Math.sin(phase - .25);
    const steps = Math.ceil(Math.max(260, Math.min(800, width * 1.25)));
    // The level of the gate is drawn with exact corners, including at narrow viewport sizes.
    function value(channel, x) {
      if (channel === 0) return .34 * taper(x, .024, .71, .065) * Math.sin(tau * 7.8 * (x - .025) - phase);
      if (channel === 1) {
        const t = x - gateStart;
        return t >= 0 && t < 4 * period && t % period < high ? .48 : 0;
      }
      if (channel === 2) {
        const u = (x - .25) / .505;
        const mix = .48 * Math.sin(tau * 2.65 * u - phase) +
          .33 * Math.sin(tau * 6.8 * u - 2 * phase + .45) +
          .19 * Math.sin(tau * 10.5 * u + phase + 1.1);
        return .41 * taper(x, .25, .755, .045) * mix;
      }
      const z = (x - pulseCenter) / .068;
      return Math.abs(z) < 1 ? .56 * Math.pow((1 + Math.cos(Math.PI * z)) / 2, 1.65) : 0;
    }
    function stroke(path, color, thickness) {
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.stroke(path);
    }
    function line(x0, y0, x1, y1) {
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Only the two phase boundaries run the full height; shorter ticks share one time scale.
    ctx.strokeStyle = "rgba(153,167,225,.19)";
    ctx.lineWidth = .75;
    ctx.setLineDash([2, 5]);
    for (const t of [.25, .76]) line(width * t, 0, width * t, height);
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(161,179,226,.34)";
    for (let i = 0; i <= 16; i++) {
      const length = i % 4 === 0 ? 5 : 2;
      line(width * i / 16, height - length, width * i / 16, height);
    }
    const xHead = turn * width;
    const sweepStrength = taper(turn, 0, 1, .04);
    const trail = Math.max(20, width * .10);
    const curtain = ctx.createLinearGradient(xHead - trail, 0, xHead, 0);
    curtain.addColorStop(0, "rgba(112,133,249,0)");
    curtain.addColorStop(1, ink("132,150,255", .13 * sweepStrength));
    ctx.fillStyle = curtain;
    ctx.fillRect(xHead - trail, 0, trail, height);
    ctx.strokeStyle = ink("177,193,255", .57 * sweepStrength);
    line(xHead, 1, xHead, height - 1);

    lanes.forEach((lane, channel) => {
      const yTop = channel * row, base = yTop + row * lane.baseline;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, yTop, width, row); ctx.clip();
      if (channel) {
        ctx.strokeStyle = "rgba(147,161,211,.15)"; ctx.lineWidth = .7;
        line(0, yTop + .5, width, yTop + .5);
      }
      const yAt = x => base - row * value(channel, x);
      const signal = new Path2D();
      signal.moveTo(0, base);
      if (channel === 1) {
        for (let i = 0; i < 4; i++) {
          const a = (gateStart + i * period) * width, b = a + high * width;
          signal.lineTo(a, base); signal.lineTo(a, base - .48 * row);
          signal.lineTo(b, base - .48 * row); signal.lineTo(b, base);
        }
        signal.lineTo(width, base);
      } else {
        for (let i = 1; i <= steps; i++) signal.lineTo(width * i / steps, yAt(i / steps));
      }
      const fill = new Path2D(signal);
      fill.lineTo(width, base); fill.lineTo(0, base); fill.closePath();
      const wash = ctx.createLinearGradient(0, yTop, 0, yTop + row);
      wash.addColorStop(0, ink(lane.rgb, .22));
      wash.addColorStop(.52, ink(lane.rgb, .045));
      wash.addColorStop(1, ink(lane.rgb, .16));
      ctx.fillStyle = wash; ctx.fill(fill);

      const trace = ctx.createLinearGradient(0, 0, width, 0);
      trace.addColorStop(0, ink(lane.rgb, .39));
      trace.addColorStop(Math.max(0, lane.start - .018), ink(lane.rgb, .43));
      trace.addColorStop(lane.start + .024, ink(lane.rgb, .99));
      trace.addColorStop(lane.end - .025, ink(lane.rgb, .99));
      trace.addColorStop(Math.min(1, lane.end + .015), ink(lane.rgb, .46));
      trace.addColorStop(1, ink(lane.rgb, .34));
      stroke(signal, ink(lane.rgb, .055), weight * 4.3);
      stroke(signal, ink(lane.rgb, .13), weight * 2.25);
      stroke(signal, trace, weight);

      const afterglow = ctx.createLinearGradient(xHead - trail, 0, xHead + 1, 0);
      afterglow.addColorStop(0, "rgba(239,243,255,0)");
      afterglow.addColorStop(1, ink("239,243,255", .87 * sweepStrength));
      ctx.save();
      ctx.beginPath(); ctx.rect(xHead - trail, yTop, trail + .5, row); ctx.clip();
      stroke(signal, afterglow, weight * 1.16);
      ctx.restore();

      // Each aperture on the gate track corresponds to one marked sample on the response.
      if (channel === 2) {
        for (let i = 0; i < 4; i++) {
          const t = gateStart + i * period + high / 2;
          const radius = Math.max(1.8, weight * 1.42);
          ctx.fillStyle = t <= turn ? "#d9d4ff" : "#1b2041";
          ctx.strokeStyle = t <= turn ? "#f0edff" : "#b0a2ef";
          ctx.lineWidth = Math.max(.8, weight * .52);
          ctx.beginPath(); ctx.arc(t * width, yAt(t), radius, 0, tau); ctx.fill(); ctx.stroke();
        }
      }
      const cy = yAt(turn), active = turn >= lane.start && turn <= lane.end;
      const radius = weight * (active ? 1.65 : 1.12);
      const halo = ctx.createRadialGradient(xHead, cy, 0, xHead, cy, radius * 3.4);
      halo.addColorStop(0, ink(lane.rgb, .58 * sweepStrength));
      halo.addColorStop(1, ink(lane.rgb, 0));
      ctx.fillStyle = halo; ctx.fillRect(xHead - radius * 3.4, cy - radius * 3.4, radius * 6.8, radius * 6.8);
      ctx.fillStyle = ink("235,239,255", (active ? 1 : .60) * sweepStrength);
      ctx.beginPath(); ctx.arc(xHead, cy, radius * .79, 0, tau); ctx.fill();
      ctx.restore();
    });
  };
}


  function mountWaveAnimation(surface, canvas, createRenderer, duration) {
    if (!("IntersectionObserver" in window) || !("Path2D" in window)) return null;
    let paint, frame = 0, inView = false;
    let width = 0, height = 0, elapsed = 0, previousTime = null, lastPaint = -Infinity;
    function fit() {
      const bounds = surface.getBoundingClientRect();
      width = bounds.width; height = bounds.height;
      if (!width || !height) return;
      const ratio = Math.min(devicePixelRatio || 1, 2, 1440 / width);
      const w = Math.round(width * ratio), h = Math.round(height * ratio);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
      }
    }
    function display() {
      if (!width || !height || !paint) return;
      paint(elapsed / duration, width, height);
      canvas.hidden = false;
    }
    function tick(now) {
      if (previousTime !== null) elapsed = (elapsed + Math.min(now - previousTime, 120)) % duration;
      previousTime = now;
      if (now - lastPaint >= 1000 / 30 - 1) {
        display();
        lastPaint = now;
      }
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      cancelAnimationFrame(frame);
      frame = 0; previousTime = null; lastPaint = -Infinity;
      if (!inView || document.hidden || reduced.matches) {
        canvas.hidden = true;
        if (reduced.matches) elapsed = 0;
        return;
      }
      if (!paint) paint = createRenderer(canvas);
      if (!paint) return;
      fit(); display();
      frame = requestAnimationFrame(tick);
    }
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    }).observe(surface);
    function resize() {
      if (inView && !document.hidden && !reduced.matches) { fit(); display(); }
    }
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(surface);
    else window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => { elapsed = 0; sync(); };
  }

  const figure = one(".signal-figure");
  const overview = one(".signal-art", figure);
  const diagram = byId("signal-timing");
  const toggle = one(".signal-switch", figure);
  const scope = one(".scope", diagram);
  mountWaveAnimation(overview, one(".signal-canvas", overview), createSignalField, 6000);
  const startTiming = mountWaveAnimation(one(".timing-plot", diagram), scope, createTimingScope, 7200);

  function setTimingView(open) {
    const justOpened = open && diagram.hidden;
    overview.hidden = open;
    diagram.hidden = !open;
    figure.dataset.view = open ? "timing" : "overview";
    toggle.textContent = open ? "信号图" : "测量时序";
    toggle.setAttribute("aria-expanded", String(open));
    if (justOpened) startTiming?.();
  }
  toggle.hidden = false;
  toggle.addEventListener("click", () => {
    const open = diagram.hidden;
    setTimingView(open);
    writeUrl("replaceState", new URL(open ? "#signal-timing" : "#slide-signal", location.href));
  });
  route(); indicateSection();
})();
