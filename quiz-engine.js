/* =====================================================================
   QUIZ ENGINE v2
   Supports three question types per chapter quiz:
     - mc        multiple choice (existing behavior)
     - match     drag-and-drop matching (drag right-column items onto left-column slots)
     - fill      fill in the blank (text input, case-insensitive, trims whitespace)

   Each chapter's quiz item can freely mix types. Gating: a chapter is
   "passed" once the learner scores >=80% on that chapter's quiz. The
   final Quiz section (cert test) stays locked until every chapter with
   a quiz has been passed.
   ===================================================================== */

const QuizEngine = (function(){
  const PASS_THRESHOLD = 0.8;
  const RESULTS_KEY = 'benchone_quiz_results'; // { [sectionId]: { correct, total, passed } }

  function loadResults(){
    try{ return JSON.parse(localStorage.getItem(RESULTS_KEY)) || {}; }catch(e){ return {}; }
  }
  function saveResults(r){
    localStorage.setItem(RESULTS_KEY, JSON.stringify(r));
  }
  function recordResult(sectionId, correct, total){
    const results = loadResults();
    const passed = total > 0 && (correct/total) >= PASS_THRESHOLD;
    results[sectionId] = { correct, total, passed };
    saveResults(results);
    updateFinalTestLock();
    return passed;
  }
  function isPassed(sectionId){
    const r = loadResults();
    return !!(r[sectionId] && r[sectionId].passed);
  }
  function clearResults(){
    localStorage.removeItem(RESULTS_KEY);
    updateFinalTestLock();
  }

  // Every chapter id that has a data-quiz-section block must be passed
  // before the final cert test unlocks.
  function allQuizSectionIds(){
    return Array.from(document.querySelectorAll('.mini-quiz-block'))
      .map(b => b.dataset.quizSection)
      .filter(Boolean);
  }
  function gatingStatus(){
    const ids = allQuizSectionIds();
    const results = loadResults();
    const passedIds = ids.filter(id => results[id] && results[id].passed);
    return { total: ids.length, passedCount: passedIds.length, allPassed: ids.length > 0 && passedIds.length === ids.length, remaining: ids.filter(id => !(results[id] && results[id].passed)) };
  }
  function updateFinalTestLock(){
    const status = gatingStatus();
    const lockScreen = document.getElementById('finalTestLock');
    const testBody = document.getElementById('finalTestBody');
    const railFinal = document.querySelector('.rail-item[data-target="quiz"]');
    if(!lockScreen || !testBody) return;
    if(status.allPassed){
      lockScreen.hidden = true;
      testBody.hidden = false;
    } else {
      lockScreen.hidden = false;
      testBody.hidden = true;
      const countEl = document.getElementById('finalLockCount');
      if(countEl) countEl.textContent = `${status.passedCount} / ${status.total} chapter quizzes passed`;
      const listEl = document.getElementById('finalLockList');
      if(listEl){
        listEl.innerHTML = status.remaining.map(id => {
          const railBtn = document.querySelector(`.rail-item[data-target="${id}"]`);
          const label = railBtn ? railBtn.textContent.replace(/[✓]/g,'').trim() : id;
          return `<button class="lock-jump-btn" data-jump="${id}">${label}</button>`;
        }).join('');
        listEl.querySelectorAll('.lock-jump-btn').forEach(btn => {
          btn.addEventListener('click', () => { if(window.showSection) window.showSection(btn.dataset.jump); });
        });
      }
    }
    if(railFinal) railFinal.classList.toggle('locked-nav', !status.allPassed);
  }

  /* ---------------- Renderers ---------------- */

  function renderMC(item, card, onAnswered){
    card.innerHTML = `
      <div class="mq-q">${item.q}</div>
      <div class="mq-opts">
        ${item.opts.map((opt,oi) => `<button class="mq-opt" data-o="${oi}"><span class="opt-mark"></span><span>${opt}</span></button>`).join('')}
      </div>
      <div class="mq-explain">${item.explain}</div>
    `;
    const buttons = card.querySelectorAll('.mq-opt');
    buttons.forEach((btn, oi) => {
      btn.addEventListener('click', () => {
        if(buttons[0].disabled) return;
        const isCorrect = oi === item.correct;
        buttons.forEach(b => b.disabled = true);
        buttons[item.correct].classList.add('correct');
        if(!isCorrect){
          btn.classList.add('wrong');
          card.classList.add('shake');
          setTimeout(() => card.classList.remove('shake'), 400);
        } else {
          card.classList.add('pulse-good');
        }
        card.querySelector('.mq-explain').classList.add('show');
        onAnswered(isCorrect);
      });
    });
  }

  function renderFill(item, card, onAnswered){
    card.innerHTML = `
      <div class="mq-q">${item.q}</div>
      <div class="mq-fill-row">
        <input type="text" class="mq-fill-input" placeholder="Type your answer" aria-label="Answer">
        <button class="mq-fill-submit">Check</button>
      </div>
      <div class="mq-explain">${item.explain}</div>
    `;
    const input = card.querySelector('.mq-fill-input');
    const submit = card.querySelector('.mq-fill-submit');
    const answers = (Array.isArray(item.answers) ? item.answers : [item.answer]).map(a => a.trim().toLowerCase());
    function check(){
      if(submit.disabled) return;
      const val = input.value.trim().toLowerCase();
      const isCorrect = answers.includes(val);
      submit.disabled = true;
      input.disabled = true;
      input.classList.add(isCorrect ? 'mq-fill-correct' : 'mq-fill-wrong');
      if(!isCorrect){
        card.classList.add('shake');
        setTimeout(() => card.classList.remove('shake'), 400);
        const hint = document.createElement('div');
        hint.className = 'mq-fill-answer-reveal';
        hint.textContent = `Correct answer: ${item.answers ? item.answers[0] : item.answer}`;
        submit.insertAdjacentElement('afterend', hint);
      } else {
        card.classList.add('pulse-good');
      }
      card.querySelector('.mq-explain').classList.add('show');
      onAnswered(isCorrect);
    }
    submit.addEventListener('click', check);
    input.addEventListener('keydown', e => { if(e.key === 'Enter') check(); });
  }

  function renderMatch(item, card, onAnswered){
    // item.pairs: [{left, right}], left = fixed prompt slots, right = draggable labels (shuffled)
    const pairs = item.pairs;
    const rightItems = pairs.map((p,i) => ({ text: p.right, forIdx: i }));
    for(let i = rightItems.length-1; i>0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [rightItems[i], rightItems[j]] = [rightItems[j], rightItems[i]];
    }
    card.innerHTML = `
      <div class="mq-q">${item.q}</div>
      <div class="mq-match-wrap">
        <div class="mq-match-slots">
          ${pairs.map((p,i) => `
            <div class="mq-match-slot" data-slot="${i}">
              <span class="mq-match-left">${p.left}</span>
              <span class="mq-match-drop" data-slot="${i}" data-filled="">Drop here</span>
            </div>
          `).join('')}
        </div>
        <div class="mq-match-pool" id="mqPool">
          ${rightItems.map((r,ri) => `<div class="mq-match-chip" draggable="true" data-for="${r.forIdx}" data-ri="${ri}">${r.text}</div>`).join('')}
        </div>
      </div>
      <button class="mq-match-submit">Check answers</button>
      <div class="mq-explain">${item.explain}</div>
    `;

    const slots = card.querySelectorAll('.mq-match-drop');
    const pool = card.querySelector('#mqPool');
    const submitBtn = card.querySelector('.mq-match-submit');
    let dragged = null;

    card.querySelectorAll('.mq-match-chip').forEach(chip => {
      chip.addEventListener('dragstart', () => { dragged = chip; chip.classList.add('dragging'); });
      chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
      // touch/click fallback: tap chip, then tap a slot
      chip.addEventListener('click', () => {
        if(submitBtn.disabled) return;
        card.querySelectorAll('.mq-match-chip').forEach(c => c.classList.remove('armed'));
        chip.classList.add('armed');
        dragged = chip;
      });
    });
    slots.forEach(slot => {
      slot.addEventListener('dragover', e => e.preventDefault());
      slot.addEventListener('drop', e => {
        e.preventDefault();
        if(dragged) placeChip(dragged, slot);
      });
      slot.addEventListener('click', () => {
        if(submitBtn.disabled) return;
        if(dragged && dragged.classList.contains('armed')){
          placeChip(dragged, slot);
        } else if(slot.dataset.filled !== ''){
          // tapping a filled slot returns the chip to the pool
          returnChip(slot);
        }
      });
    });

    function placeChip(chip, slot){
      if(slot.dataset.filled !== ''){ returnChip(slot); }
      slot.textContent = chip.textContent;
      slot.dataset.filled = chip.dataset.for;
      slot.dataset.chipRi = chip.dataset.ri;
      slot.classList.add('filled');
      chip.classList.add('placed');
      chip.classList.remove('armed');
      chip.style.display = 'none';
      dragged = null;
      checkComplete();
    }
    function returnChip(slot){
      const ri = slot.dataset.chipRi;
      const chip = pool.querySelector(`.mq-match-chip[data-ri="${ri}"]`);
      if(chip){ chip.style.display = ''; chip.classList.remove('placed'); }
      slot.textContent = 'Drop here';
      slot.dataset.filled = '';
      slot.dataset.chipRi = '';
      slot.classList.remove('filled');
      checkComplete();
    }
    function checkComplete(){
      const filled = [...slots].every(s => s.dataset.filled !== '');
      submitBtn.disabled = !filled;
    }
    checkComplete();

    submitBtn.addEventListener('click', () => {
      if(submitBtn.disabled) return;
      submitBtn.disabled = true;
      let correctCount = 0;
      slots.forEach(slot => {
        const slotIdx = parseInt(slot.dataset.slot);
        const filledFor = parseInt(slot.dataset.filled);
        const isRight = filledFor === slotIdx;
        slot.classList.add(isRight ? 'mq-match-right' : 'mq-match-wrongfill');
        if(isRight) correctCount++;
      });
      pool.querySelectorAll('.mq-match-chip').forEach(c => c.style.pointerEvents = 'none');
      const allCorrect = correctCount === pairs.length;
      if(!allCorrect){ card.classList.add('shake'); setTimeout(() => card.classList.remove('shake'), 400); }
      else card.classList.add('pulse-good');
      card.querySelector('.mq-explain').classList.add('show');
      onAnswered(allCorrect);
    });
  }

  function renderItem(item, card, onAnswered){
    const type = item.type || 'mc';
    if(type === 'mc') renderMC(item, card, onAnswered);
    else if(type === 'fill') renderFill(item, card, onAnswered);
    else if(type === 'match') renderMatch(item, card, onAnswered);
  }

  function renderQuizBlock(block, items){
    const container = block.querySelector('.mini-quiz-container');
    if(container.dataset.rendered) return;
    container.dataset.rendered = '1';
    if(!items || !items.length) return;
    let answered = 0, correct = 0;
    const sectionId = block.dataset.quizSection;

    const scoreEl = document.createElement('div');
    scoreEl.className = 'mq-score';
    scoreEl.textContent = `0 / ${items.length}`;
    container.appendChild(scoreEl);

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'mq-card';
      container.appendChild(card);
      renderItem(item, card, (isCorrect) => {
        answered++;
        if(isCorrect) correct++;
        scoreEl.textContent = `${correct} / ${items.length}`;
        if(answered >= items.length){
          const passed = recordResult(sectionId, correct, items.length);
          scoreEl.classList.add(passed ? 'mq-score-pass' : 'mq-score-fail');
          scoreEl.textContent += passed ? ' — passed' : ' — needs 80% to pass, try again';
          if(!passed){
            const retryBtn = document.createElement('button');
            retryBtn.className = 'charge-btn';
            retryBtn.style.marginTop = '10px';
            retryBtn.textContent = 'Retry this quiz';
            retryBtn.addEventListener('click', () => {
              container.innerHTML = '';
              delete container.dataset.rendered;
              renderQuizBlock(block, shuffle(items));
            });
            container.appendChild(retryBtn);
          } else {
            LessonProgress.markDone(sectionId);
          }
        }
      });
    });
  }

  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a;
  }

  function renderAll(dataSource){
    document.querySelectorAll('.mini-quiz-block').forEach(block => {
      const items = dataSource[block.dataset.quizSection];
      renderQuizBlock(block, items);
    });
    updateFinalTestLock();
  }

  function resetBlock(block, dataSource){
    const container = block.querySelector('.mini-quiz-container');
    container.innerHTML = '';
    delete container.dataset.rendered;
    renderQuizBlock(block, dataSource[block.dataset.quizSection]);
  }

  return { renderAll, recordResult, isPassed, clearResults, gatingStatus, updateFinalTestLock, resetBlock, PASS_THRESHOLD };
})();

/* Note: inline in-page subsection dropdowns were replaced by routed
   subsection pages (rail dropdown + standalone <section>s) — see script.js. */