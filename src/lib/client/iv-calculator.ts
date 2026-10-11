import type { Species, StatKey } from '../core/types';
import { STAT_KEYS, STAT_LABELS, STAT_SHORT, clampInt, formatDexId } from '../core/types';
import { NATURES, natureByName } from '../core/natures';
import { solveIVRange, intersectRange, applyCharacteristic, combosWithoutCharacteristic, isExact } from '../core/solve';
import type { IVSets } from '../core/solve';
import { statRange } from '../core/stats';
import { CHARACTERISTICS } from '../core/characteristics';
import { JUDGE_MODERN } from '../core/judge';
import { createSpeciesPicker } from './species-picker';
import { loadDex } from './load-dex';
import { track, oncePerLoad } from './events';
import { esc, fmtInt, copyText, flash, q } from './dom';
import { icon } from '../icons';

export function initIVCalculator(root: HTMLElement) {
  const speciesRoot = q('#iv-species', root);
  const levelInput = q<HTMLInputElement>('#iv-level', root);
  const natureSelect = q<HTMLSelectElement>('#iv-nature', root);
  const showEv = q<HTMLInputElement>('#iv-showev', root);
  const evWrap = q<HTMLElement>('#iv-evwrap', root);
  const charSelect = q<HTMLSelectElement>('#iv-char', root);
  const readout = q('#iv-readout', root);
  const rowsEl = q('#iv-rows', root);
  const footEl = q('#iv-foot', root);
  const statusEl = q('#iv-status', root);

  const statInputs = {} as Record<StatKey, HTMLInputElement>;
  const evInputs = {} as Record<StatKey, HTMLInputElement>;
  const judgeSelects = {} as Record<StatKey, HTMLSelectElement>;
  const hintEls = {} as Record<StatKey, HTMLElement>;
  for (const k of STAT_KEYS) {
    statInputs[k] = q<HTMLInputElement>(`#iv-stat-${k}`, root);
    evInputs[k] = q<HTMLInputElement>(`#iv-ev-${k}`, root);
    judgeSelects[k] = q<HTMLSelectElement>(`#iv-judge-${k}`, root);
    hintEls[k] = q(`#iv-hint-${k}`, root);
  }

  // ---- build selects ----
  const neutral = NATURES.filter((n) => !n.plus);
  const affected = NATURES.filter((n) => n.plus);
  natureSelect.innerHTML =
    '<optgroup label="Neutral - no effect">' +
    neutral
      .map((n) => `<option value="${n.name}"${n.name === 'Serious' ? ' selected' : ''}>${n.name}</option>`)
      .join('') +
    '</optgroup><optgroup label="Raises one stat · lowers another">' +
    affected
      .map((n) => `<option value="${n.name}">${n.name} - +${STAT_SHORT[n.plus!]} / −${STAT_SHORT[n.minus!]}</option>`)
      .join('') +
    '</optgroup>';

  for (const k of STAT_KEYS) {
    judgeSelects[k].innerHTML =
      '<option value="">Judge phrase - optional</option>' +
      JUDGE_MODERN.map((t, i) => {
        const r = t.min === t.max ? `${t.min}` : `${t.min}–${t.max}`;
        return `<option value="${i}">${t.label} (${r})</option>`;
      }).join('');
  }

  charSelect.innerHTML =
    '<option value=""> - none selected - </option>' +
    (['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as StatKey[])
      .map((k) =>
        `<optgroup label="${STAT_LABELS[k]}${k === 'hp' ? '' : ''}">` +
        CHARACTERISTICS.filter((c) => c.stat === k)
          .map((c) => `<option value="${CHARACTERISTICS.indexOf(c)}">${c.text} - ends in ${c.mod5}</option>`)
          .join('') +
        '</optgroup>',
      )
      .join('');

  // ---- state ----
  let species: Species | null = null;
  let level = 50;
  let nature = natureByName('Serious');

  const picker = createSpeciesPicker(speciesRoot, (sp) => {
    species = sp;
    updateHints();
    recompute();
  });

  // ---- wiring ----
  const readLevel = () => {
    level = clampInt(Number(levelInput.value) || 1, 1, 100);
    if (String(level) !== levelInput.value) levelInput.value = String(level);
  };
  levelInput.addEventListener('input', () => {
    readLevel();
    updateHints();
    recompute();
  });
  root.querySelectorAll<HTMLButtonElement>('.iv-lvl-chip').forEach((btn) =>
    btn.addEventListener('click', () => {
      levelInput.value = btn.dataset.level ?? '50';
      readLevel();
      updateHints();
      recompute();
    }),
  );
  natureSelect.addEventListener('change', () => {
    nature = natureByName(natureSelect.value || 'Serious');
    updateHints();
    recompute();
  });
  showEv.addEventListener('change', () => {
    evWrap.hidden = !showEv.checked;
    updateHints();
    recompute();
  });
  for (const k of STAT_KEYS) {
    statInputs[k].addEventListener('input', recompute);
    evInputs[k].addEventListener('input', recompute);
    judgeSelects[k].addEventListener('change', recompute);
  }
  charSelect.addEventListener('change', recompute);

  q('#iv-reset', root).addEventListener('click', () => {
    for (const k of STAT_KEYS) {
      statInputs[k].value = '';
      evInputs[k].value = '0';
      judgeSelects[k].value = '';
    }
    charSelect.value = '';
    showEv.checked = false;
    evWrap.hidden = true;
    levelInput.value = '50';
    natureSelect.value = 'Serious';
    level = 50;
    nature = natureByName('Serious');
    species = null;
    picker.setSpecies(null);
    updateHints();
    recompute();
  });

  function currentEV(k: StatKey): number {
    return showEv.checked ? clampInt(Number(evInputs[k].value) || 0, 0, 252) : 0;
  }

  function updateHints() {
    for (const k of STAT_KEYS) {
      if (species?.id === 292 && k === 'hp') {
        hintEls[k].textContent = 'Shedinja: HP is always 1 in game';
        continue;
      }
      if (!species) {
        hintEls[k].textContent = '';
        continue;
      }
      const r = statRange(species.base[k], currentEV(k), level, nature, k);
      hintEls[k].textContent = `possible ${r.min}–${r.max}`;
    }
  }

  // ---- core ----
  function recompute() {
    flash(readout);

    if (!species) {
      statusEl.innerHTML = icon('scan-line', 12) + ' standby';
      statusEl.className = 'status-chip status-chip--wait';
      rowsEl.innerHTML = '';
      footEl.innerHTML = 'Pick a species, then enter the stats shown in game - each IV is solved against the exact Gen 3–9 formula.';
      return;
    }
    oncePerLoad('tool_start', { tool_name: 'iv_calculator' });

    const shedinja = species.id === 292;
    const sets: IVSets = {};
    const evsUsed = new Map<StatKey, number>();

    for (const k of STAT_KEYS) {
      if (shedinja && k === 'hp') continue;
      const raw = statInputs[k].value.trim();
      const observed = raw !== '' && Number.isFinite(Number(raw)) ? Math.round(Number(raw)) : null;
      const tierIdx = judgeSelects[k].value === '' ? null : JUDGE_MODERN[Number(judgeSelects[k].value)];
      const ev = currentEV(k);
      evsUsed.set(k, ev);

      let set: number[] | null = null;
      if (observed !== null) {
        set = solveIVRange({ base: species.base[k], level, ev, nature, stat: k, observed });
      }
      if (tierIdx) {
        const range = Array.from({ length: tierIdx.max - tierIdx.min + 1 }, (_, i) => tierIdx.min + i);
        set = set ? intersectRange(set, tierIdx.min, tierIdx.max) : range;
      }
      if (set) sets[k] = set;
    }

    const charIdx = charSelect.value === '' ? null : CHARACTERISTICS[Number(charSelect.value)];
    let displaySets = sets;
    let combos = combosWithoutCharacteristic(sets);
    let exact = isExact(sets);
    let conflictStat: StatKey | null = null;

    if (charIdx) {
      const refined = applyCharacteristic(sets, { stat: charIdx.stat, mod5: charIdx.mod5 });
      if (refined.consistent) {
        displaySets = refined.sets;
        combos = refined.combos;
        exact = refined.exact;
      } else {
        conflictStat = refined.conflict ?? charIdx.stat;
      }
    }

    const anyEmpty = STAT_KEYS.some((k) => displaySets[k]?.length === 0);

    // ---- render rows ----
    rowsEl.innerHTML = STAT_KEYS.map((k) => {
      if (shedinja && k === 'hp') {
        return `<div class="stat-row"><span class="stat-row__label">HP</span><span class="stat-row__value stat-row__value--none">n/a</span><span class="iv-bar">${'<i></i>'.repeat(32)}</span><span class="stat-row__note">always 1</span></div>`;
      }
      const set = displaySets[k];
      let value = '-';
      let cls = 'stat-row__value--none';
      let note = '';
      if (set && set.length === 0) {
        value = 'no match';
        cls = 'stat-row__value--bad';
        note = 'check inputs';
      } else if (set && set.length === 1) {
        value = String(set[0]);
        cls = 'stat-row__value--exact';
        note = 'exact';
      } else if (set) {
        value = `${set[0]}–${set[set.length - 1]}`;
        cls = 'stat-row__value--range';
        note = `${set.length} candidates`;
      }
      const bar = Array.from({ length: 32 }, (_, i) => {
        if (!set || set.length === 0) return '<i></i>';
        if (!set.includes(i)) return '<i></i>';
        return set.length === 1 ? '<i class="single"></i>' : '<i class="hit"></i>';
      }).join('');
      const charMark = charIdx && charIdx.stat === k ? '◆' : '';
      return `<div class="stat-row"><span class="stat-row__label">${STAT_SHORT[k]}${charMark}</span><span class="stat-row__value ${cls}">${value}</span><span class="iv-bar" role="img" aria-label="${STAT_LABELS[k]} IV ${value}">${bar}</span><span class="stat-row__note">${note}</span></div>`;
    }).join('');

    // ---- status & foot ----
    if (anyEmpty) {
      statusEl.innerHTML = icon('circle-x', 12) + ' no solution';
      statusEl.className = 'status-chip status-chip--bad';
      footEl.innerHTML = `Some stat can't be reproduced with any IV 0–31 - re-check the <b>level</b>, <b>nature</b>, <b>EVs</b> and the numbers you entered (possible ranges are shown under each field).`;
      track('tool_error', { tool_name: 'iv_calculator', error_type: 'no_match' });
    } else if (conflictStat) {
      statusEl.innerHTML = icon('triangle-alert', 12) + ' conflict';
      statusEl.className = 'status-chip status-chip--bad';
      const isNamed = conflictStat === charIdx?.stat;
      footEl.innerHTML = `The characteristic <b>${esc(charIdx!.text)}</b> is impossible here - ${isNamed ? `no matching IV for <b>${STAT_LABELS[conflictStat]}</b>` : `<b>${STAT_LABELS[conflictStat]}</b> ends up higher than the characteristic stat`}. Double-check the phrase, the stats and the judge tiers.`;
      track('tool_error', { tool_name: 'iv_calculator', error_type: 'characteristic_conflict' });
    } else if (combos === null) {
      statusEl.innerHTML = icon('scan-line', 12) + ' awaiting input';
      statusEl.className = 'status-chip status-chip--wait';
      footEl.innerHTML = `Enter any stats you can read in game (summary screen) - blank fields stay open, filled fields narrow the scan.`;
    } else if (exact && combos === 1) {
      statusEl.innerHTML = icon('circle-check', 12) + ' exact match';
      statusEl.className = 'status-chip status-chip--ok';
      footEl.innerHTML = `<b>Exact IV spread determined.</b> ${esc(species.display)} · Lv ${level} · ${esc(nature.name)}${charIdx ? ` · characteristic “${esc(charIdx.text)}” applied` : ''}`;
      track('tool_complete', { tool_name: 'iv_calculator', exact: true });
    } else {
      statusEl.innerHTML = icon('scan-line', 12) + ` ${fmtInt(combos ?? 0)} spreads`;
      statusEl.className = 'status-chip status-chip--wait';
      footEl.innerHTML = `<b>${fmtInt(combos ?? 0)} possible IV spreads.</b> Rounding at low levels hides IV differences - re-check the same Pokémon at a <b>higher level</b> (Lv 50 is near-exact) or add judge tiers to narrow it down.`;
      if ((combos ?? Infinity) <= 8) track('tool_complete', { tool_name: 'iv_calculator', exact: false });
    }

    if (charIdx && !conflictStat && !anyEmpty) {
      footEl.innerHTML += `<br>Characteristic: <b>${STAT_LABELS[charIdx.stat]}</b> is tied for highest IV and ends in <b>${charIdx.mod5}</b>.`;
    }
  }

  // ---- copy ----
  q('#iv-copy', root).addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    if (!species) return;
    const lines: string[] = [];
    lines.push(`IVXray - IV check · ${species.display} ${formatDexId(species.id)} · Lv ${level} · ${nature.name} nature`);
    for (const k of STAT_KEYS) {
      const set = judgeSelects[k].value;
      const t = set === '' ? '' : ` [judge: ${JUDGE_MODERN[Number(set)].label}]`;
      const raw = statInputs[k].value.trim();
      lines.push(`${STAT_LABELS[k]}: ${raw === '' ? '-' : raw}${t}`);
    }
    const rowTexts = Array.from(rowsEl.querySelectorAll<HTMLElement>('.stat-row')).map((row) => {
      const label = row.querySelector('.stat-row__label')?.textContent ?? '';
      const value = row.querySelector('.stat-row__value')?.textContent ?? '';
      return `${label} ${value}`;
    });
    lines.push('', `IVs → ${rowTexts.join(' · ')}`, `Status: ${statusEl.textContent}`, '', 'https://ivforge.top/iv-calculator/');
    const ok = await copyText(lines.join('\n'));
    track('result_copy', { tool_name: 'iv_calculator' });
    btn.textContent = ok ? 'Copied ✓' : 'Copy failed';
    setTimeout(() => (btn.textContent = 'Copy results'), 1600);
  });

  // ---- worked example: Garchomp, Lv 50, Serious, 0 EV, all-31 stats ----
  q('#iv-example', root).addEventListener('click', () => {
    loadDex()
      .then((list) => {
        const garchomp = list.find((s) => s.id === 445);
        if (!garchomp) return;
        showEv.checked = false;
        evWrap.hidden = true;
        levelInput.value = '50';
        level = 50;
        natureSelect.value = 'Serious';
        nature = natureByName('Serious');
        charSelect.value = '';
        for (const k of STAT_KEYS) {
          evInputs[k].value = '0';
          judgeSelects[k].value = '';
        }
        const sample: Record<StatKey, string> = { hp: '183', atk: '150', def: '115', spa: '100', spd: '105', spe: '122' };
        for (const k of STAT_KEYS) statInputs[k].value = sample[k];
        picker.setSpecies(garchomp);
        updateHints();
        recompute();
        track('example_load', { tool_name: 'iv_calculator' });
      })
      .catch(() => {});
  });

  recompute();
}
