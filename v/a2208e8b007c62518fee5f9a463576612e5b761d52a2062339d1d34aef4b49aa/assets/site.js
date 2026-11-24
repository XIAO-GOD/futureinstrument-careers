(() => {
  const nav = Array.from(document.querySelectorAll(".main-nav a"));
  const chapters = nav.map(link => document.getElementById(link.hash.slice(1)));
  const masthead = document.querySelector(".masthead");

  function updateUrl(method, url) {
    try { history[method](null, "", url); } catch { /* Local file viewers may keep their original address. */ }
  }

  const initial = new URL(location.href);
  const oldGroup = initial.searchParams.get("group");
  for (const oldKey of ["group", "family", "list", "q"]) initial.searchParams.delete(oldKey);
  if (initial.hash === "#apply") initial.hash = "jobs";
  if (!initial.hash || initial.hash === "#jobs") {
    if (oldGroup === "tech" || oldGroup === "business") initial.hash = "jobs-" + oldGroup;
    else if (oldGroup === "all") initial.hash = "jobs";
  }
  const migrated = initial.href !== location.href;
  if (migrated) updateUrl("replaceState", initial);

  function setupTabs(tabList) {
    const tabs = Array.from(tabList.querySelectorAll("a"));
    const panels = tabs.map(tab => document.getElementById(tab.hash.slice(1)));
    const section = tabList.closest("section");
    tabList.setAttribute("role", "tablist");
    for (const [i, tab] of tabs.entries()) {
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panels[i].id);
      panels[i].setAttribute("role", "tabpanel");
      panels[i].tabIndex = 0;
    }

    function show(index) {
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
      });
    }
    function choose(index, method) {
      show(index);
      if (location.hash !== tabs[index].hash) updateUrl(method, tabs[index].href);
    }
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        choose(i, "pushState");
      });
      tab.addEventListener("keydown", event => {
        const indices = {Home: 0, End: tabs.length - 1,
          ArrowLeft: (i + tabs.length - 1) % tabs.length, ArrowRight: (i + 1) % tabs.length};
        if (!(event.key in indices)) return;
        event.preventDefault();
        choose(indices[event.key], "replaceState");
        tabs[indices[event.key]].focus({preventScroll: true});
      });
    });
    show(0);
    return target => {
      if (target === section) show(0);
      else {
        const i = panels.findIndex(panel => panel.contains(target));
        if (i >= 0) show(i);
      }
    };
  }

  const tabGroups = Array.from(document.querySelectorAll(".catalog-tabs"), setupTabs);
  function readLocation(alignMigrated = false) {
    const target = document.getElementById(location.hash.slice(1));
    if (!target) return;
    tabGroups.forEach(selectFor => selectFor(target));
    let anchor = target;
    if (target.matches(".job-row")) target.open = true;
    else if (target.matches(".catalog-panel")) anchor = target.closest("section");
    else if (!alignMigrated) return;
    requestAnimationFrame(() => {
      if (location.hash.slice(1) === target.id) anchor.scrollIntoView({behavior: "instant", block: "start"});
    });
  }
  window.addEventListener("hashchange", () => readLocation());
  window.addEventListener("popstate", () => readLocation());
  readLocation(migrated);

  let scheduled = false;
  function markChapter() {
    const line = masthead.offsetHeight + 24;
    let current = 0;
    chapters.forEach((section, i) => { if (section.getBoundingClientRect().top <= line) current = i; });
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) current = nav.length - 1;
    nav.forEach((link, i) => {
      if (i === current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    scheduled = false;
  }
  function scheduleMark() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(markChapter);
  }
  window.addEventListener("scroll", scheduleMark, {passive: true});
  window.addEventListener("resize", scheduleMark);
  window.addEventListener("load", markChapter);
  markChapter();
})();
