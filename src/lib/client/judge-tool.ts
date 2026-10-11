import type { StatKey } from '../core/types';
import { STAT_KEYS, STAT_LABELS, STAT_SHORT } from '../core/types';
import { JUDGE_MODES, JUDGE_TOTAL_POTENTIAL, judgeModeById } from '../core/judge';
import type { JudgeMode, JudgeTier } from '../core/judge';
import { CHARACTERISTICS } from '../core/characteristics';
import { track, oncePerLoad } from './events';
import { esc, flash, q } from './dom';

export function initJudgeTool(root: HTMLElement) {
  const tabsEl = q('#judge-tabs', root);
  const modePanel = q('#judge-modepanel', root);
  const rowsEl = q('#judge-rows', root);
  const footEl = q('#judge-foot', root);
  const readout = q('#judge-readout', root);

  let mode: JudgeMode = JUDGE_MODES[0];

  function tierRow(label: string, tier: JudgeTier, highlight = false): string {
    const value = tier.min === tier.max ? `${tier.min}` : `${tier.min}–${tier.max}`;
    const bar = Array.from({ length: 32 }, (_, i) =>
      i >= tier.min && i <= tier.max ? '<i class="hit"></i>' : '<i></i>',
    ).join('');
    return `<div class="stat-row"${highlight ? ' style="border-color:rgba(143,165,255,.45)"' : ''}>
      <span class="stat-row__label">${esc(label)}</span>
      <span class="stat-row__value stat-row__value--range">${value}</span>
      <span class="iv-bar" role="img" aria-label="${esc(label)} ${value}">${bar}</span>
      <span class="stat-row__note">${esc(tier.label)}</span>
    </div>`;
  }

  function statSelect(id: string, tiers: readonly JudgeTier[]): string {
    return `<div class="field"><label for="${id}">Stat the judge praised</label>
      <select id="${id}" class="select">${STAT_KEYS.map((k, i) => `<option value="${k}"${k === 'atk' ? ' selected' : ''}>${STAT_LABELS[k]}</option>`).join('')}</select></div>`;
  }

  function phraseSelect(id: string, tiers: readonly JudgeTier[], label: string, optional = false): string {
    return `<div class="field"><label for="${id}">${esc(label)}</label>
      <select id="${id}" class="select">${optional ? '<option value="" selected> - pick the phrase - </option>' : ''}${tiers.map((t, i) => {
        const r = t.min === t.max ? `${t.min}` : `${t.min}–${t.max}`;
        return `<option value="${i}">“${esc(t.label)}” → ${r}</option>`;
      }).join('')}</select></div>`;
  }

  function renderPanel() {
    if (mode.allStats) {
      modePanel.innerHTML = `
        <p class="sub" style="margin:0 0 12px;color:var(--ink-2);font-size:13px">
          ${esc(mode.games)} - the judge labels <b>every</b> stat. Pick the phrase shown for each stat:
        </p>
        <div class="field-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
          ${STAT_KEYS.map((k) => phraseSelect(`jt-${k}`, mode.tiers, STAT_LABELS[k], true)).join('')}
        </div>`;
    } else {
      modePanel.innerHTML = `
        <p class="sub" style="margin:0 0 12px;color:var(--ink-2);font-size:13px">
          ${esc(mode.games)} - the judge only comments on the Pokémon's <b>highest</b> IV, plus an overall verdict.
        </p>
        <div class="field-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
          ${statSelect('jt-beststat', mode.tiers)}
          ${phraseSelect('jt-bestphrase', mode.tiers, 'Phrase about that stat')}
          ${phraseSelect('jt-total', JUDGE_TOTAL_POTENTIAL, 'Overall potential')}
        </div>`;
    }
    wire();
    recompute();
  }

  function recompute() {
    const rows: string[] = [];
    if (mode.allStats) {
      for (const k of STAT_KEYS) {
        const sel = q<HTMLSelectElement>(`#jt-${k}`, modePanel);
        if (sel.value === '') {
          rows.push(`<div class="stat-row"><span class="stat-row__label">${STAT_SHORT[k]}</span><span class="stat-row__value stat-row__value--none">-</span><span class="iv-bar">${'<i></i>'.repeat(32)}</span><span class="stat-row__note">not judged yet</span></div>`);
        } else {
          rows.push(tierRow(STAT_SHORT[k], mode.tiers[Number(sel.value)]));
        }
      }
      footEl.innerHTML = `Each phrase maps to an exact IV range in ${esc(mode.label)} games. “Best” (or “Fantastic” at 30) are what breeders aim for; anything 26+ is competitive-ready.`;
    } else {
      const statSel = q<HTMLSelectElement>('#jt-beststat', modePanel);
      const phraseSel = q<HTMLSelectElement>('#jt-bestphrase', modePanel);
      const totalSel = q<HTMLSelectElement>('#jt-total', modePanel);
      const stat = statSel.value as StatKey;
      const tier = mode.tiers[Number(phraseSel.value)];
      const total = JUDGE_TOTAL_POTENTIAL[Number(totalSel.value)];
      rows.push(tierRow(STAT_SHORT[stat], tier, true));
      rows.push(tierRow('SUM', total));
      for (const k of STAT_KEYS) {
        if (k === stat) continue;
        rows.push(`<div class="stat-row"><span class="stat-row__label">${STAT_SHORT[k]}</span><span class="stat-row__value stat-row__value--none">not shown</span><span class="iv-bar">${'<i></i>'.repeat(32)}</span><span class="stat-row__note"></span></div>`);
      }
      footEl.innerHTML = `In ${esc(mode.label)} games the judge reveals only the <b>highest</b> IV (${STAT_LABELS[stat]} here) and the IV <b>sum</b> (${total.min}–${total.max}). Use the <a href="/iv-calculator/" style="color:var(--readout-blue)">IV Calculator</a> with the stat summary to pin the rest.`;
    }
    rowsEl.innerHTML = rows.join('');
    flash(readout);
    oncePerLoad('tool_start', { tool_name: 'iv_judge' });
  }

  function wire() {
    modePanel.querySelectorAll<HTMLSelectElement>('select').forEach((sel) =>
      sel.addEventListener('change', recompute),
    );
  }

  tabsEl.innerHTML = JUDGE_MODES.map(
    (m, i) => `<button type="button" class="tab${i === 0 ? ' active' : ''}" data-mode="${m.id}">${esc(m.label)}</button>`,
  ).join('');
  tabsEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.tab');
    if (!btn) return;
    mode = judgeModeById(btn.dataset.mode!);
    tabsEl.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === btn));
    renderPanel();
  });

  renderPanel();
}

/** Second card on the judge page: characteristic phrase → stat + IV mod 5. */
export function initCharacteristicCard(root: HTMLElement) {
  const sel = q<HTMLSelectElement>('#char-lookup', root);
  const out = q('#char-out', root);

  // Build via DOM APIs (not innerHTML): option insertion is synchronous in every engine,
  // so the list is complete the moment init returns.
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = ' - pick the phrase - ';
  sel.append(placeholder);
  for (const k of ['hp', 'atk', 'def', 'spe', 'spa', 'spd'] as StatKey[]) {
    const group = document.createElement('optgroup');
    group.label = STAT_LABELS[k];
    for (const c of CHARACTERISTICS.filter((ch) => ch.stat === k)) {
      const opt = document.createElement('option');
      opt.value = String(CHARACTERISTICS.indexOf(c));
      opt.textContent = `“${c.text}”`;
      group.append(opt);
    }
    sel.append(group);
  }

  sel.addEventListener('change', () => {
    if (sel.value === '') {
      out.innerHTML = '<span class="sub" style="color:var(--ink-3)">The phrase pins which stat is highest and its last digit.</span>';
      return;
    }
    const c = CHARACTERISTICS[Number(sel.value)];
    const set = Array.from({ length: 7 }, (_, i) => c.mod5 + 5 * i).filter((v) => v <= 31);
    out.innerHTML = `
      <dl class="kv">
        <dt>Stat</dt><dd><b>${STAT_LABELS[c.stat]}</b> - tied for the highest IV on this Pokémon</dd>
        <dt>IV ends in</dt><dd><b>${c.mod5}</b> → IV ∈ {${set.join(', ')}}</dd>
        <dt>All other stats</dt><dd>must be ≤ this IV (ties are possible)</dd>
      </dl>
      <p class="sub" style="margin:10px 0 0">Feed this into the <a href="/iv-calculator/">IV Calculator</a>'s characteristic field to narrow its results.</p>`;
  });

  out.innerHTML = '<span class="sub" style="color:var(--ink-3)">The phrase pins which stat is highest and its last digit.</span>';
}
