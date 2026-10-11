import type { BaseStats, StatKey } from '../core/types';
import { STAT_KEYS, STAT_LABELS, clampInt } from '../core/types';
import {
  HP_TYPES,
  bestSpreadsForType,
  hiddenPowerPower,
  hiddenPowerType,
  hiddenPowerTypeIndex,
} from '../core/hidden-power';
import { typeColor } from '../core/type-colors';
import { track, oncePerLoad } from './events';
import { esc, copyText, flash, q } from './dom';

export function initHiddenPowerTool(root: HTMLElement) {
  const readout = q('#hp-readout', root);
  const typeEl = q('#hp-type', root);
  const powerEl = q('#hp-power', root);
  const powerLabel = q('#hp-powerlabel', root);
  const bitsEl = q('#hp-bits', root);
  const genChips = root.querySelectorAll<HTMLButtonElement>('.hp-gen-chip');
  const targetSelect = q<HTMLSelectElement>('#hp-target', root);
  const spreadsEl = q('#hp-spreads', root);

  let gen: '3-5' | '6-7' = '6-7';

  const inputs = {} as Record<StatKey, HTMLInputElement>;
  for (const k of STAT_KEYS) inputs[k] = q<HTMLInputElement>(`#hp-${k}`, root);
  for (const k of STAT_KEYS) {
    inputs[k].addEventListener('input', recompute);
  }

  genChips.forEach((chip) =>
    chip.addEventListener('click', () => {
      gen = (chip.dataset.gen as '3-5' | '6-7') ?? '6-7';
      genChips.forEach((c) => c.classList.toggle('chip--on', c === chip));
      recompute();
      renderTargets();
    }),
  );

  targetSelect.innerHTML =
    '<option value=""> - choose a type - </option>' +
    HP_TYPES.map((t, i) => `<option value="${i}">${t}</option>`).join('');
  targetSelect.addEventListener('change', renderTargets);

  function readIVs(): BaseStats {
    return {
      hp: clampInt(Number(inputs.hp.value) || 0, 0, 31),
      atk: clampInt(Number(inputs.atk.value) || 0, 0, 31),
      def: clampInt(Number(inputs.def.value) || 0, 0, 31),
      spa: clampInt(Number(inputs.spa.value) || 0, 0, 31),
      spd: clampInt(Number(inputs.spd.value) || 0, 0, 31),
      spe: clampInt(Number(inputs.spe.value) || 0, 0, 31),
    };
  }

  function recompute() {
    flash(readout);
    oncePerLoad('tool_start', { tool_name: 'hidden_power' });
    const ivs = readIVs();
    const type = hiddenPowerType(ivs);
    const color = typeColor(type.toLowerCase());
    typeEl.textContent = type;
    typeEl.style.color = color;
    const badge = q('#hp-typebadge', root);
    badge.style.background = color;
    badge.textContent = type;

    if (gen === '3-5') {
      powerEl.textContent = String(hiddenPowerPower(ivs));
      powerLabel.textContent = 'base power (30–70)';
    } else {
      powerEl.textContent = '60';
      powerLabel.textContent = 'fixed power in Gen 6–7';
    }

    // parity/bit breakdown - stat order here is display order; weights follow
    // the game's mapping: HP 1 · Atk 2 · Def 4 · Spe 8 · Sp. Atk 16 · Sp. Def 32
    const weight: Record<StatKey, number> = { hp: 1, atk: 2, def: 4, spe: 8, spa: 16, spd: 32 };
    const weightOrder: StatKey[] = ['hp', 'atk', 'def', 'spe', 'spa', 'spd'];
    bitsEl.innerHTML = weightOrder
      .map((k) => {
        const iv = ivs[k];
        const parity = iv & 1;
        const second = (iv >> 1) & 1;
        return `<div class="stat-row">
          <span class="stat-row__label">${esc(STAT_LABELS[k])}</span>
          <span class="stat-row__value">${iv}</span>
          <span class="mono" style="font-size:11px;color:var(--readout-dim)">parity ${parity} ×${weight[k]}${gen === '3-5' ? ` · 2nd bit ${second} ×${weight[k]}` : ''}</span>
          <span class="stat-row__note">${parity ? 'odd' : 'even'}</span>
        </div>`;
      })
      .join('');
  }

  function renderTargets() {
    if (targetSelect.value === '') {
      spreadsEl.innerHTML = '<span class="sub" style="color:var(--ink-3)">Pick a type to see the IV spreads that produce it while keeping the most 31s.</span>';
      return;
    }
    const t = Number(targetSelect.value);
    const spreads = bestSpreadsForType(t);
    spreadsEl.innerHTML = spreads
      .map(
        (s) =>
          `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px dashed var(--line)">
            <span class="mono" style="font-size:13.5px;font-weight:600">${STAT_KEYS.map((k) => s.ivs[k]).join(' / ')}</span>
            <span class="chip">${s.evens === 0 ? 'all 31s' : `${s.evens}× 30`}</span>
            <span class="sub" style="color:var(--ink-3)">${gen === '3-5' ? 'power 70' : 'power 60 (fixed)'}</span>
          </div>`,
      )
      .join('') +
      `<p class="sub" style="color:var(--ink-3);margin:10px 0 0">Order: HP / Atk / Def / Sp. Atk / Sp. Def / Speed. ${
        spreads.length > 1 ? `All ${spreads.length} listed spreads are equally good (same number of 30s). ` : ''
      }Every spread also guarantees maximum power 70 in Gen 3–5.</p>`;
  }

  q('#hp-random', root).addEventListener('click', () => {
    for (const k of STAT_KEYS) inputs[k].value = String(Math.floor(Math.random() * 32));
    recompute();
  });
  q('#hp-max', root).addEventListener('click', () => {
    for (const k of STAT_KEYS) inputs[k].value = '31';
    recompute();
  });
  q('#hp-copy', root).addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const ivs = readIVs();
    const text = [
      `IVXray - Hidden Power check`,
      `IVs (HP/Atk/Def/SpA/SpD/Spe): ${STAT_KEYS.map((k) => ivs[k]).join('/')}`,
      `Type: ${hiddenPowerType(ivs)}`,
      `Power: ${gen === '3-5' ? hiddenPowerPower(ivs) : '60 (fixed in Gen 6–7)'}`,
      '',
      'https://ivforge.top/hidden-power/',
    ].join('\n');
    const ok = await copyText(text);
    track('result_copy', { tool_name: 'hidden_power' });
    btn.textContent = ok ? 'Copied ✓' : 'Copy failed';
    setTimeout(() => (btn.textContent = 'Copy result'), 1600);
  });

  for (const k of STAT_KEYS) inputs[k].value = '31';
  recompute();
  renderTargets();
}
