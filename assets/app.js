const root = document.querySelector('#app');
const headerAction = document.querySelector('#headerAction');
const hideLessonButton = document.querySelector('#hideLessonButton');
const tabs = [...document.querySelectorAll('.tab-bar a')];
const STORE = 'say-it-practice-v1';
const CUSTOM_STORE = 'say-it-custom-lessons-v1';
const RETURN_ROUTE_STORE = 'say-it-previous-list-v1';
let db;
let searchTerm = '';
let previousListRoute = readPreviousListRoute();
let previousListScroll = readPreviousListScroll();
let restoreListScroll = null;

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function readProgress() {
  try {
    const progress = JSON.parse(localStorage.getItem(STORE)) || {};
    return {saved:Array.isArray(progress.saved) ? progress.saved : [], hidden:Array.isArray(progress.hidden) ? progress.hidden : [], uses:progress.uses && typeof progress.uses === 'object' ? progress.uses : {}, currentId:typeof progress.currentId === 'string' ? progress.currentId : ''};
  } catch { return {saved:[], hidden:[], uses:{}, currentId:''}; }
}
function writeProgress(progress) { localStorage.setItem(STORE, JSON.stringify(progress)); }
function readPreviousListRoute() {
  try {
    const route = sessionStorage.getItem(RETURN_ROUTE_STORE);
    return route && /^#(?:home|browse|add|saved|archive|questions|category\/[\w-]+)$/.test(route) ? route : '#browse';
  } catch { return '#browse'; }
}
function readPreviousListScroll() {
  try { const value = Number(sessionStorage.getItem(`${RETURN_ROUTE_STORE}-scroll`)); return Number.isFinite(value) && value >= 0 ? value : 0; }
  catch { return 0; }
}
function readCustomLessons() {
  try {
    const lessons = JSON.parse(localStorage.getItem(CUSTOM_STORE));
    return Array.isArray(lessons) ? lessons : [];
  } catch { return []; }
}
function getCategory(id) { return db.categories.find(category => category.id === id); }
function getLesson(id) { return db.lessons.find(lesson => lesson.id === id); }
function titleSentence(lesson) { return lesson.good.split(/\s\/\s/)[0]; }
function lessonHref(lesson) { return `#lesson/${lesson.id}`; }
function categoryHref(category) { return `#category/${category.id}`; }
function isArchived(lesson, progress = readProgress()) { return (progress.uses[lesson.id] || 0) >= 10; }
function isHidden(lesson, progress = readProgress()) { return progress.hidden.includes(lesson.id); }
function isActive(lesson, progress = readProgress()) { return !isArchived(lesson, progress) && !isHidden(lesson, progress); }
function categoryLessons(categoryId) { const progress = readProgress(); return db.lessons.filter(lesson => lesson.category === categoryId && isActive(lesson, progress)); }
function randomPracticeLesson() {
  const progress = readProgress();
  const active = db.lessons.filter(lesson => isActive(lesson, progress));
  return active[Math.floor(Math.random() * active.length)] || null;
}
function setPage(markup, preserveScroll = false) { const scrollTop = window.scrollY; root.innerHTML = markup; root.scrollTop = 0; window.scrollTo(0, restoreListScroll ?? (preserveScroll ? scrollTop : 0)); restoreListScroll = null; }
function sectionTitle(title, link = '') {
  return `<div class="section-title"><h2>${title}</h2>${link}</div>`;
}
function lessonRow(lesson) {
  const category = getCategory(lesson.category);
  const progress = readProgress();
  const uses = progress.uses[lesson.id] || 0;
  return `<a class="saved-row" href="${lessonHref(lesson)}"><div class="row-copy"><b>${escapeHtml(titleSentence(lesson))}</b><small>${escapeHtml(category.name)} · ${uses}/10 uses${isHidden(lesson,progress) ? ' · hidden' : ''}</small></div><span class="row-arrow" aria-hidden="true">›</span></a>`;
}
function categoryRow(category) {
  const count = categoryLessons(category.id).length;
  return `<a class="category-row" href="${categoryHref(category)}"><span class="category-icon" aria-hidden="true">${category.icon}</span><span class="row-copy"><b>${escapeHtml(category.name)}</b><small>${count} ${count === 1 ? 'lesson' : 'lessons'}</small></span><span class="row-arrow" aria-hidden="true">›</span></a>`;
}
function stepperMarkup(lesson, uses, prefix) {
  const archived = uses >= 10;
  return `<div class="use-stepper" aria-label="Sentence use count"><button class="stepper-button" id="${prefix}Down" aria-label="Decrease use count" ${uses === 0 ? 'disabled' : ''}>−</button><span class="stepper-value">${uses}<small>/10</small></span><button class="stepper-button" id="${prefix}Up" aria-label="Increase use count" ${uses >= 10 ? 'disabled' : ''}>+</button><span class="stepper-caption">${archived ? 'done' : 'uses'}</span></div>`;
}
function attachStepper(lesson, prefix, rerender) {
  function change(delta) {
    const progress = readProgress();
    const nextCount = Math.max(0, Math.min(10, (progress.uses[lesson.id] || 0) + delta));
    progress.uses[lesson.id] = nextCount;
    if (nextCount < 10 && !isHidden(lesson,progress)) progress.currentId = lesson.id;
    else if (progress.currentId === lesson.id) {
      const start = db.lessons.findIndex(item => item.id === lesson.id);
      progress.currentId = '';
      for (let step = 1; step <= db.lessons.length; step++) {
        const candidate = db.lessons[(start + step) % db.lessons.length];
        if (isActive(candidate,progress)) { progress.currentId = candidate.id; break; }
      }
    }
    writeProgress(progress);
    rerender();
  }
  document.querySelector(`#${prefix}Down`)?.addEventListener('click', () => change(-1));
  document.querySelector(`#${prefix}Up`)?.addEventListener('click', () => change(1));
}
function renderHome(preserveScroll = false) {
  const progress = readProgress();
  const practice = progress.saved.map(getLesson).filter(lesson => lesson && isActive(lesson, progress));
  const practiceCards = practice.map((lesson, index) => {
    const uses = progress.uses[lesson.id] || 0;
    const prefix = `practice${index}`;
    return `<article class="practice-card"><a class="practice-sentence" href="${lessonHref(lesson)}">${escapeHtml(titleSentence(lesson))}<span aria-hidden="true">›</span></a><div class="practice-meta"><span>${escapeHtml(getCategory(lesson.category).name)}</span>${stepperMarkup(lesson,uses,prefix)}</div></article>`;
  }).join('');
  setPage(`<div class="hello"><div class="eyebrow">A little practice goes a long way</div><h1>Hi there 👋</h1><p>One useful phrase at a time.</p></div>
    <button class="random-pick-button home-random-button" id="randomPickButton">↻ Pick a random sentence</button>
    ${sectionTitle('Your practice')}${practice.length ? `<div class="practice-list">${practiceCards}</div>` : `<div class="empty-state practice-empty"><h2>No practice sentences yet</h2><p>Save a favorite with the heart on any lesson, and it will appear here.</p><a class="button secondary" href="#browse">Choose a sentence</a></div>`}
    ${sectionTitle('Explore categories','<a href="#browse">See all</a>')}<div class="category-list">${db.categories.map(categoryRow).join('')}</div>`,preserveScroll);
  practice.forEach((lesson,index) => attachStepper(lesson,`practice${index}`,() => renderHome(true)));
  document.querySelector('#randomPickButton').addEventListener('click', () => {
    const picked = randomPracticeLesson();
    if (picked) location.hash = lessonHref(picked);
  });
}
function renderBrowse() {
  setPage(`<div class="hello"><div class="eyebrow">Find a phrase for the moment</div><h1>Browse</h1><p>Choose a situation or look up a sentence.</p></div>
    <a class="category-row questions-link" href="#questions"><span class="category-icon">❔</span><span class="row-copy"><b>Question patterns</b><small>${db.lessons.filter(lesson => lesson.tags.includes('questioning') && isActive(lesson)).length} sentences to practice</small></span><span class="row-arrow" aria-hidden="true">›</span></a>
    <label class="eyebrow" for="lessonSearch">Search lessons</label><input id="lessonSearch" class="search" type="search" placeholder="Try “I don't care”" value="${escapeHtml(searchTerm)}" autocomplete="off">
    <div id="browseResults">${browseResults(searchTerm)}</div>`);
  document.querySelector('#lessonSearch').addEventListener('input', event => {
    searchTerm = event.target.value;
    document.querySelector('#browseResults').innerHTML = browseResults(searchTerm);
  });
}
function renderAdd() {
  setPage(`<div class="hello"><div class="eyebrow">Make it yours</div><h1>Add a sentence</h1><p>Save a sentence you want to practice and its natural version.</p></div>
    <section class="custom-form-card"><form id="customLessonForm" class="custom-form">
      <label for="customBad">Sentence to improve</label><textarea id="customBad" name="bad" rows="2" required maxlength="300" placeholder="Write your sentence"></textarea>
      <label for="customGood">A natural version</label><textarea id="customGood" name="good" rows="2" required maxlength="300" placeholder="How would you say it naturally?"></textarea>
      <label for="customWhy">Why or when to use it <span>(optional)</span></label><textarea id="customWhy" name="why" rows="2" maxlength="500" placeholder="Add a short note"></textarea>
      <label for="customStory">Example in context <span>(optional)</span></label><textarea id="customStory" name="story" rows="3" maxlength="1000" placeholder="Add a short example or story"></textarea>
      <label for="customCategory">Category</label><select id="customCategory" name="category">${db.categories.map(category => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`).join('')}</select>
      <button class="button" type="submit">Save to Your practice</button>
    </form></section>`);
  document.querySelector('#customLessonForm').addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const storyText = String(form.get('story') || '').trim();
    const lesson = {
      id,
      category:String(form.get('category')),
      bad:String(form.get('bad')).trim(),
      good:String(form.get('good')).trim(),
      why:String(form.get('why') || '').trim(),
      tags:['custom'],
      story:storyText ? storyText.split(/\n+/).map(line => line.trim()).filter(Boolean) : [],
      frequencyRank:99,
      custom:true
    };
    const customLessons = readCustomLessons();
    customLessons.push(lesson);
    localStorage.setItem(CUSTOM_STORE, JSON.stringify(customLessons));
    db.lessons.push(lesson);
    const progress = readProgress();
    if (!progress.saved.includes(id)) progress.saved.push(id);
    progress.currentId = id;
    writeProgress(progress);
    previousListRoute = '#add';
    previousListScroll = window.scrollY;
    try { sessionStorage.setItem(RETURN_ROUTE_STORE, previousListRoute); sessionStorage.setItem(`${RETURN_ROUTE_STORE}-scroll`, String(previousListScroll)); } catch {}
    location.hash = lessonHref(lesson);
  });
}
function renderQuestions() {
  const questions = db.lessons.filter(lesson => lesson.tags.includes('questioning') && isActive(lesson));
  setPage(`<a class="back-link" href="#browse">‹ Browse</a><div class="hello"><div class="eyebrow">Keep conversations moving</div><h1>Question patterns</h1><p>${questions.length} sentences to practice.</p></div><div class="saved-list">${questions.map(lessonRow).join('') || '<div class="empty-state"><h2>No active questions</h2><p>Archived and hidden questions are in Archive.</p><a class="button secondary" href="#archive">Open Archive</a></div>'}</div>`);
}
function browseResults(term) {
  if (!term.trim()) return `<div class="category-list">${db.categories.map(categoryRow).join('')}</div>`;
  const needle = term.toLowerCase();
  const found = db.lessons.filter(lesson => isActive(lesson) && [lesson.bad, lesson.good, lesson.why, ...lesson.tags].join(' ').toLowerCase().includes(needle));
  return found.length ? `<div class="saved-list">${found.map(lessonRow).join('')}</div>` : `<div class="empty-state"><div class="empty-icon">⌕</div><h2>No matches yet</h2><p>Try a different word or browse a category.</p></div>`;
}
function renderCategory(id) {
  const category = getCategory(id);
  if (!category) return renderBrowse();
  const lessons = categoryLessons(id);
  setPage(`<a class="back-link" href="#browse">‹ All categories</a><div class="hello lesson-category"><div class="eyebrow">${category.icon} Category</div><h1>${escapeHtml(category.name)}</h1><p>Pick a sentence to practice.</p></div><div class="saved-list">${lessons.map(lessonRow).join('') || '<div class="empty-state"><h2>All caught up here</h2><p>Completed sentences are in your archive.</p><a class="button secondary" href="#archive">View archive</a></div>'}</div>`);
}
function renderLesson(id, preserveScroll = false) {
  const lesson = getLesson(id);
  if (!lesson) return renderHome();
  const category = getCategory(lesson.category);
  const progress = readProgress();
  const hidden = isHidden(lesson, progress);
  if (isActive(lesson, progress) && progress.currentId !== id) { progress.currentId = id; writeProgress(progress); }
  const isSaved = progress.saved.includes(id);
  const uses = progress.uses[id] || 0;
  const archived = uses >= 10;
  const otherOption = lesson.good.split(/\s\/\s/).slice(1).join(' / ');
  const details = otherOption || lesson.why || lesson.story.length ? `<div class="explanation-panel">${otherOption ? `<section class="answer-card"><div class="answer-label">Another natural option</div><p class="answer-sentence">${escapeHtml(otherOption)}</p></section>` : ''}
    ${lesson.why ? `<section class="lesson-section"><h2>Why this sounds different</h2><p>${escapeHtml(lesson.why)}</p></section>` : ''}
    ${lesson.story.length ? `<section class="lesson-section"><h2>In context</h2><p class="story-copy">${lesson.story.map(escapeHtml).join(' ')}</p></section>` : ''}</div>` : '';
  setPage(`<a class="back-link" href="#category/${category.id}">‹ ${escapeHtml(category.name)}</a><div class="eyebrow">${escapeHtml(category.name)}</div><h1 class="lesson-title">${escapeHtml(titleSentence(lesson))}</h1>
    <div class="tags">${lesson.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
    <section class="mistake-card"><div class="mistake-label">Less natural in this context</div><p class="mistake-sentence">${escapeHtml(lesson.bad)}</p></section>
    <section class="usage-card"><div class="usage-inline"><b>Times used</b>${stepperMarkup(lesson,uses,'lessonUse')}</div></section>
    ${archived ? `<div class="archive-notice"><b>✓ Archived</b><span>Used 10 times</span></div>` : ''}${details}`,preserveScroll);
  headerAction.hidden = false;
  headerAction.textContent = isSaved ? '♥' : '♡';
  headerAction.setAttribute('aria-label', isSaved ? 'Remove saved lesson' : 'Save lesson');
  hideLessonButton.hidden = archived && !hidden;
  hideLessonButton.textContent = hidden ? (archived ? 'Unhide' : 'Restore') : 'Hide';
  hideLessonButton.setAttribute('aria-label', hidden ? (archived ? 'Remove this sentence from Hidden' : 'Restore this sentence to practice') : 'Hide this sentence because I already know it');
  hideLessonButton.onclick = () => {
    const current = readProgress();
    if (hidden) {
      current.hidden = current.hidden.filter(hiddenId => hiddenId !== id);
      if (!isArchived(lesson,current)) current.currentId = id;
      writeProgress(current);
      renderLesson(id,true);
    } else {
      if (!current.hidden.includes(id)) current.hidden.push(id);
      if (current.currentId === id) current.currentId = '';
      writeProgress(current);
      restoreListScroll = previousListScroll;
      location.hash = previousListRoute;
    }
  };
  headerAction.onclick = () => {
    const current = readProgress();
    current.saved = current.saved.includes(id) ? current.saved.filter(savedId => savedId !== id) : [...current.saved, id];
    writeProgress(current);
    renderLesson(id,true);
  };
  attachStepper(lesson,'lessonUse',() => renderLesson(id,true));
}
function renderSaved() {
  const progress = readProgress();
  const saved = progress.saved.map(getLesson).filter(lesson => lesson && isActive(lesson, progress));
  setPage(`<div class="hello"><div class="eyebrow">Keep the phrases you want to remember</div><h1>Saved</h1><p>Tap a favorite to practice it on the home page.</p></div>${saved.length ? `<div class="saved-list">${saved.map(lessonRow).join('')}</div>` : `<div class="empty-state"><div class="empty-icon">♡</div><h2>No saved phrases yet</h2><p>Tap the heart on a lesson to keep it here for later.</p><a class="button secondary" href="#browse">Find a phrase</a></div>`}`);
}
function renderArchive() {
  const progress = readProgress();
  const archived = db.lessons.filter(lesson => isArchived(lesson, progress) && !isHidden(lesson,progress));
  const hidden = progress.hidden.map(getLesson).filter(Boolean);
  setPage(`<div class="hello"><div class="eyebrow">Keep what you know</div><h1>Archive</h1><p>Review completed sentences or restore ones you hid.</p></div>
    ${archived.length ? `${sectionTitle(`Used 10 times · ${archived.length}`)}<div class="saved-list">${archived.map(lessonRow).join('')}</div>` : ''}
    ${hidden.length ? `${sectionTitle(`Hidden by you · ${hidden.length}`)}<div class="saved-list">${hidden.map(lessonRow).join('')}</div>` : ''}
    ${!archived.length && !hidden.length ? '<div class="empty-state"><div class="empty-icon">▤</div><h2>Your archive is empty</h2><p>Sentences you use 10 times or hide will appear here.</p><a class="button secondary" href="#browse">Choose a sentence</a></div>' : ''}`);
}
function render() {
  const [route, id] = location.hash.replace(/^#/, '').split('/');
  if (['home','browse','add','saved','archive','questions','category'].includes(route)) {
    previousListRoute = location.hash;
    try { sessionStorage.setItem(RETURN_ROUTE_STORE, previousListRoute); } catch {}
  } else if (!route) {
    previousListRoute = '#home';
    try { sessionStorage.setItem(RETURN_ROUTE_STORE, previousListRoute); } catch {}
  }
  headerAction.hidden = true;
  hideLessonButton.hidden = true;
  if (route === 'lesson') renderLesson(id);
  else if (route === 'category') renderCategory(id);
  else if (route === 'browse') renderBrowse();
  else if (route === 'add') renderAdd();
  else if (route === 'questions') renderQuestions();
  else if (route === 'saved') renderSaved();
  else if (route === 'archive') renderArchive();
  else renderHome();
  const activeTab = route === 'browse' || route === 'category' || route === 'questions' ? 'browse' : route === 'add' ? 'add' : route === 'saved' ? 'saved' : route === 'archive' ? 'archive' : 'home';
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === activeTab));
}

window.addEventListener('hashchange', render);
document.addEventListener('click', event => {
  const link = event.target.closest?.('a[href^="#lesson/"]');
  if (!link) return;
  previousListRoute = location.hash || '#home';
  previousListScroll = window.scrollY;
  try { sessionStorage.setItem(RETURN_ROUTE_STORE, previousListRoute); sessionStorage.setItem(`${RETURN_ROUTE_STORE}-scroll`, String(previousListScroll)); } catch {}
});
function loadJson(path) {
  return fetch(path).then(response => {
    if (!response.ok) throw new Error(`Could not load ${path}.`);
    return response.json();
  });
}
loadJson('./database.json').then(async manifest => {
  const [categories, ...lessonGroups] = await Promise.all([
    loadJson(manifest.categories),
    ...manifest.lessonFiles.map(item => loadJson(item.file))
  ]);
  const lessons = lessonGroups.flat();
  const originalOrder = new Map(manifest.lessonOrder.map((id,index) => [id,index]));
  db = { categories, lessons };
  db.lessons.push(...readCustomLessons());
  db.lessons.sort((a,b) => (a.frequencyRank ?? 5) - (b.frequencyRank ?? 5) || (originalOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (originalOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER));
  render();
}).catch(() => {
  setPage('<div class="empty-state"><div class="empty-icon">☁</div><h2>Could not load lessons</h2><p>Open this app through a local web server or its GitHub Pages link.</p></div>');
});
