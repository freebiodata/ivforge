import type { Species, StatKey } from '../core/types';
import { STAT_KEYS, STAT_SHORT, totalBase, formatDexId } from '../core/types';
import { GEN_RANGES } from '../core/dex';
import { typeColor } from '../core/type-colors';
import { loadDex } from './load-dex';
import { esc, fmtInt, debounce, q } from './dom';

const PAGE = 100;

export function initDexBrowser(root: HTMLElement) {
  const searchInput = q<HTMLInputElement>('#dex-q', root);
  const genSelect = q<HTMLSelectElement>('#dex-gen', root);
  const countEl = q('#dex-count', root);
  const tbody = q<HTMLTableSectionElement>('#dex-tbody', root);
  const moreBtn = q<HTMLButtonElement>('#dex-more', root);
  const statusEl = q('#dex-status', root);

  genSelect.innerHTML =
    '<option value="0">All generations</option>' +
    GEN_RANGES.map(
      (g) => `<option value="${g.gen}">Gen ${g.gen} · ${g.region} (${g.max - g.min + 1})</option>`,
    ).join('');

  let all: Species[] = [];
  let view: Species[] = [];
  let shown = 0;
  let sortKey: StatKey | 'id' | 'total' = 'id';
  let sortDir: 1 | -1 = 1;

  const cols: { key: StatKey | 'id' | 'total'; label: string; title: string }[] = [
    { key: 'id', label: '#', title: 'National Dex number' },
    { key: 'hp', label: 'HP', title: 'Base HP' },
    { key: 'atk', label: 'ATK', title: 'Base Attack' },
    { key: 'def', label: 'DEF', title: 'Base Defense' },
    { key: 'spa', label: 'SPA', title: 'Base Special Attack' },
    { key: 'spd', label: 'SPD', title: 'Base Special Defense' },
    { key: 'spe', label: 'SPE', title: 'Base Speed' },
    { key: 'total', label: 'TOTAL', title: 'Base stat total' },
  ];

  root.querySelectorAll<HTMLTableCellElement>('th[data-sort]').forEach((th) =>
    th.addEventListener('click', () => {
      const key = th.dataset.sort as StatKey | 'id' | 'total';
      if (sortKey === key) sortDir = sortDir === 1 ? -1 : 1;
      else {
        sortKey = key;
        sortDir = key === 'id' ? 1 : -1;
      }
      updateSortHeads();
      apply();
    }),
  );

  function updateSortHeads() {
    root.querySelectorAll<HTMLTableCellElement>('th[data-sort]').forEach((th) => {
      const key = th.dataset.sort;
      th.textContent = cols.find((c) => c.key === key)!.label + (sortKey === key ? (sortDir === 1 ? ' ↑' : ' ↓') : '');
    });
  }

  function filtered(): Species[] {
    const gen = Number(genSelect.value);
    let list = gen ? all.filter((s) => s.gen === gen) : all;
    const query = searchInput.value.trim().toLowerCase();
    if (query) {
      const num = query.replace(/^#/, '');
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.display.toLowerCase().includes(query) ||
          (/^\d+$/.test(num) && s.id === Number(num)),
      );
    }
    const val = (s: Species): number =>
      sortKey === 'id' ? s.id : sortKey === 'total' ? totalBase(s.base) : s.base[sortKey];
    return [...list].sort((a, b) => (val(a) - val(b)) * sortDir || a.id - b.id);
  }

  function rowHTML(s: Species): string {
    const total = totalBase(s.base);
    const maxStat = Math.max(...STAT_KEYS.map((k) => s.base[k]));
    const cells = STAT_KEYS.map((k) =>
      `<td class="num${s.base[k] === maxStat ? ' best' : ''}">${s.base[k]}</td>`,
    ).join('');
    return `<tr>
      <td class="num">${formatDexId(s.id)}</td>
      <td><b>${esc(s.display)}</b></td>
      <td>${s.types.map((t) => `<span class="type-badge" style="background:${typeColor(t)}">${t}</span>`).join(' ')}</td>
      ${cells}
      <td class="num" style="font-weight:700">${total}</td>
    </tr>`;
  }

  function renderMore() {
    const slice = view.slice(shown, shown + PAGE);
    tbody.insertAdjacentHTML('beforeend', slice.map(rowHTML).join(''));
    shown += slice.length;
    moreBtn.hidden = shown >= view.length;
    countEl.textContent = `Showing ${fmtInt(shown)} of ${fmtInt(view.length)} species`;
  }

  function apply() {
    view = filtered();
    shown = 0;
    tbody.innerHTML = '';
    renderMore();
  }

  const onInput = debounce(apply, 90);
  searchInput.addEventListener('input', onInput);
  genSelect.addEventListener('change', apply);
  moreBtn.addEventListener('click', renderMore);

  statusEl.textContent = 'Loading 1,025 species…';
  loadDex()
    .then((list) => {
      all = list;
      statusEl.hidden = true;
      updateSortHeads();
      apply();
    })
    .catch(() => {
      statusEl.textContent = 'Could not load the species data - check your connection and reload.';
    });
}
