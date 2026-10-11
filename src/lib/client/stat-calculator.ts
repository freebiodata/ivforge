import type { Species, StatKey, BaseStats } from '../core/types';
import { STAT_KEYS, STAT_LABELS, STAT_SHORT, clampInt, formatDexId, MAX_EV_PER_STAT, MAX_EV_TOTAL } from '../core/types';
import { NATURES, natureByName } from '../core/natures';
import { calcSpread, statValue, totalEV } from '../core/stats';
import { createSpeciesPicker } from './species-picker';
import { loadDex } from './load-dex';
import { track, oncePerLoad } from './events';
import { esc, copyText, flash, q } from './dom';
import { icon } from '../icons';

function makeStats(fill: (k: StatKey) => number): BaseStats {
  return { hp: fill('hp'), atk: fill('atk'), def: fill('def'), spa: fill('spa'), spd: fill('spd'), spe: fill('spe') };
}

export function initStatCalculator(root: HTMLElement) {
  const speciesRoot = q('#stat-species', root);
  const levelInput = q<HTMLInputElement>('#stat-level', root);
  const natureSelect = q<HTMLSelectElement>('#stat-nature', root);
  const readout = q('#stat-readout', root);
  const rowsEl = q('#stat-rows', root);
  const footEl = q('#stat-foot', root);
  const statusEl = q('#stat-status', root);
  const projRows = q('#stat-100-rows', root);
  const projFoot = q('#stat-100-foot', root);
  const gaugeFill = q<HTMLElement>('#stat-gauge-fill', root);
  const gaugeLabel = q('#stat-ev-total', root);
  const evWarn = q('#stat-evwarn', root);
  const natureFx = q('#stat-naturefx', root);

  const ivInputs = {} as Record<StatKey, HTMLInputElement>;
  const evInputs = {} as Record<StatKey, HTMLInputElement>;
  for (const k of STAT_KEYS) {
    ivInputs[k] = q<HTMLInputElement>(`#stat-iv-${k}`, root);
    evInputs[k] = q<HTMLInputElement>(`#stat-ev-${k}`, root);
  }

  // nature select - identical layout to the IV calculator
  natureSelect.innerHTML =
    '<optgroup label="Neutral - no effect">' +
    NATURES.filter((n) => !n.plus)
      .map((n) => `<option value="${n.name}"${n.name === 'Serious' ? ' selected' : ''}>${n.name}</option>`)
      .join('') +
    '</optgroup><optgroup label="Raises one stat · lowers another">' +
    NATURES.filter((n) => n.plus)
      .map((n) => `<option value="${n.name}">${n.name} - +${STAT_SHORT[n.plus!]} / −${STAT_SHORT[n.minus!]}</option>`)
      .join('') +
    '</optgroup>';

  let species: Species | null = null;
  let level = 50;
  let nature = natureByName('Serious');

  const picker = createSpeciesPicker(speciesRoot, (sp) => {
    species = sp;
    recompute();
  });

  levelInput.addEventListener('input', () => {
    level = clampInt(Number(levelInput.value) || 1, 1, 100);
    if (String(level) !== levelInput.value) levelInput.value = String(level);
    recompute();
  });
  natureSelect.addEventListener('change', () => {
    nature = natureByName(natureSelect.value || 'Serious');
    recompute();
  });
  for (const k of STAT_KEYS) {
    ivInputs[k].addEventListener('input', recompute);
    evInputs[k].addEventListener('input', recompute);
  }
  root.querySelectorAll<HTMLButtonElement>('.stat-lvl-chip').forEach((btn) =>
    btn.addEventListener('click', () => {
      levelInput.value = btn.dataset.level ?? '50';
      level = clampInt(Number(levelInput.value), 1, 100);
      recompute();
    }),
  );
  q('#stat-maxev', root).addEventListener('click', () => {
    // classic competitive skeleton: 252 / 252 / 4
    const plan: Partial<Record<StatKey, number>> = { hp: 252, atk: 252, spe: 4 };
    for (const k of STAT_KEYS) evInputs[k].value = String(plan[k] ?? 0);
    recompute();
  });
  q('#stat-clearev', root).addEventListener('click', () => {
    for (const k of STAT_KEYS) evInputs[k].value = '0';
    recompute();
  });
  q('#stat-reset', root).addEventListener('click', () => {
    for (const k of STAT_KEYS) {
      ivInputs[k].value = '31';
      evInputs[k].value = '0';
    }
    levelInput.value = '50';
    natureSelect.value = 'Serious';
    level = 50;
    nature = natureByName('Serious');
    species = null;
    picker.setSpecies(null);
    recompute();
  });

  function readIVs(): BaseStats {
    return makeStats((k) => clampInt(Number(ivInputs[k].value) || 0, 0, 31));
  }
  function readEVs(): BaseStats {
    return makeStats((k) => clampInt(Number(evInputs[k].value) || 0, 0, MAX_EV_PER_STAT));
  }

  function rowHTML(k: StatKey, value: number, note: string): string {
    return `<div class="stat-row"><span class="stat-row__label">${STAT_SHORT[k]}</span><span class="stat-row__value stat-row__value--exact">${value}</span><span class="mono" style="font-size:11px;color:var(--readout-dim)">base ${species!.base[k]}${note}</span><span class="stat-row__note"></span></div>`;
  }

  function recompute() {
    flash(readout);

    // EV budget
    const evs = readEVs();
    const used = totalEV(evs);
    const overTotal = used > MAX_EV_TOTAL;
    gaugeFill.style.width = `${Math.min(100, (used / MAX_EV_TOTAL) * 100)}%`;
    gaugeFill.className = `gauge-fill${overTotal ? ' over' : ''}`;
    gaugeLabel.textContent = `${used} / ${MAX_EV_TOTAL} EVs`;
    evWarn.hidden = !overTotal;
    if (overTotal) evWarn.textContent = `EV total ${used} exceeds the in-game cap of ${MAX_EV_TOTAL} - the last points would be wasted.`;

    // nature effect chips
    natureFx.innerHTML = nature.plus
      ? `<span class="chip chip--on">+10% ${STAT_LABELS[nature.plus]}</span><span class="chip">−10% ${STAT_LABELS[nature.minus!]}</span>`
      : `<span class="chip">${nature.name}: no stat change</span>`;

    if (!species) {
      statusEl.innerHTML = icon('gauge', 12) + ' standby';
      statusEl.className = 'status-chip status-chip--wait';
      rowsEl.innerHTML = '';
      projRows.innerHTML = '';
      footEl.innerHTML = 'Pick a species to compute its final stats from base stats, IVs, EVs, level and nature.';
      projFoot.textContent = '';
      return;
    }
    oncePerLoad('tool_start', { tool_name: 'stat_calculator' });

    const ivs = readIVs();
    const now = calcSpread({ base: species.base, ivs, evs, level, nature });
    const at100 = calcSpread({ base: species.base, ivs, evs, level: 100, nature });

    rowsEl.innerHTML = STAT_KEYS.map((k) => rowHTML(k, now[k], '')).join('');
    projRows.innerHTML = STAT_KEYS.map((k) => rowHTML(k, at100[k], '')).join('');

    statusEl.innerHTML = icon('gauge', 12) + ` Lv ${level}`;
    statusEl.className = 'status-chip';
    footEl.innerHTML = `<b>${esc(species.display)}</b> ${formatDexId(species.id)} · Lv ${level} · ${esc(nature.name)}${overTotal ? ' · <span style="color:var(--readout-red)">EV cap exceeded</span>' : ''}`;
    projFoot.innerHTML = `Same IVs/EVs/nature at <b>Lv 100</b> - what this Pokémon becomes fully trained at the level cap.`;
    track('tool_complete', { tool_name: 'stat_calculator', level });
  }

  q('#stat-copy', root).addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    if (!species) return;
    const evs = readEVs();
    const ivs = readIVs();
    const now = calcSpread({ base: species.base, ivs, evs, level, nature });
    const at100 = calcSpread({ base: species.base, ivs, evs, level: 100, nature });
    const line = (s: BaseStats) => STAT_KEYS.map((k) => `${STAT_SHORT[k]} ${s[k]}`).join(' / ');
    const text = [
      `IVXray - ${species.display} ${formatDexId(species.id)} · ${nature.name} · EVs ${totalEV(evs)}/510`,
      `IVs: ${STAT_KEYS.map((k) => ivs[k]).join('/')}`,
      `EVs: ${STAT_KEYS.map((k) => evs[k]).join('/')}`,
      `Lv ${level}: ${line(now)}`,
      `Lv 100: ${line(at100)}`,
      '',
      'https://ivforge.top/stat-calculator/',
    ].join('\n');
    const ok = await copyText(text);
    track('result_copy', { tool_name: 'stat_calculator' });
    btn.textContent = ok ? 'Copied ✓' : 'Copy failed';
    setTimeout(() => (btn.textContent = 'Copy stats'), 1600);
  });

  // ---- worked example: Garchomp, Lv 50, Adamant, 31 IVs, EVs 252/252/4 ----
  q('#stat-example', root).addEventListener('click', () => {
    loadDex()
      .then((list) => {
        const garchomp = list.find((s) => s.id === 445);
        if (!garchomp) return;
        for (const k of STAT_KEYS) {
          ivInputs[k].value = '31';
          evInputs[k].value = '0';
        }
        evInputs.hp.value = '252';
        evInputs.atk.value = '252';
        evInputs.spe.value = '4';
        levelInput.value = '50';
        level = 50;
        natureSelect.value = 'Adamant';
        nature = natureByName('Adamant');
        picker.setSpecies(garchomp);
        recompute();
        track('example_load', { tool_name: 'stat_calculator' });
      })
      .catch(() => {});
  });

  recompute();
}
