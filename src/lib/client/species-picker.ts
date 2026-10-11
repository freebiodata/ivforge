import type { Species } from '../core/types';
import { STAT_KEYS, STAT_SHORT, totalBase, formatDexId } from '../core/types';
import { searchDex } from '../core/dex';
import { typeColor } from '../core/type-colors';
import { loadDex } from './load-dex';
import { esc, debounce } from './dom';

export interface PickerHandle {
  setSpecies(sp: Species | null): void;
  getSpecies(): Species | null;
}

/**
 * Expected markup inside `root`:
 *   <div class="sp-selected" hidden></div>
 *   <div class="sp-box">
 *     <input class="input sp-input" … />
 *     <div class="sp-results" role="listbox" hidden></div>
 *   </div>
 *   <div class="sp-status sub" hidden></div>
 */
export function createSpeciesPicker(root: HTMLElement, onSelect: (sp: Species | null) => void): PickerHandle {
  const input = root.querySelector<HTMLInputElement>('.sp-input')!;
  const resultsEl = root.querySelector<HTMLElement>('.sp-results')!;
  const selectedEl = root.querySelector<HTMLElement>('.sp-selected')!;
  const statusEl = root.querySelector<HTMLElement>('.sp-status')!;

  let dex: readonly Species[] = [];
  let species: Species | null = null;
  let results: Species[] = [];
  let active = -1;
  let open = false;

  loadDex()
    .then((list) => {
      dex = list;
      if (!species) renderDefault();
    })
    .catch(() => {
      statusEl.hidden = false;
      statusEl.textContent = 'Could not load the species list - check your connection and reload.';
    });

  function renderDefault() {
    if (species || !dex.length) return;
    results = dex.slice(0, 24);
    active = 0;
    if (open) renderResults('');
  }

  function typeBadges(sp: Species): string {
    return sp.types.map((t) => `<span class="type-badge" style="background:${typeColor(t)}">${esc(t)}</span>`).join(' ');
  }

  function markMatch(text: string, query: string): string {
    const q = query.trim().toLowerCase();
    if (!q) return esc(text);
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return esc(text);
    return `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
  }

  function renderResults(query: string) {
    if (!results.length) {
      resultsEl.innerHTML = `<div class="sp-more">No species found${query ? ` for “${esc(query)}”` : ''}.</div>`;
    } else {
      const rows = results
        .map((sp, i) => {
          const cls = i === active ? 'sp-option active' : 'sp-option';
          return `<div class="${cls}" role="option" data-i="${i}" aria-selected="${i === active}">
            <span class="sp-id">${formatDexId(sp.id)}</span>
            <span class="sp-name">${markMatch(sp.display, query)}</span>
            <span class="sp-bst">BST ${totalBase(sp.base)}</span>
            <span>${typeBadges(sp)}</span>
          </div>`;
        })
        .join('');
      const more = `<div class="sp-more">Showing ${results.length} of ${dex.length.toLocaleString('en-US')} species - keep typing to narrow down.</div>`;
      resultsEl.innerHTML = rows + (query ? more : '');
    }
    resultsEl.hidden = false;
  }

  function openPanel() {
    open = true;
    if (!results.length && dex.length) {
      results = searchDex(dex, input.value, 24);
      active = 0;
    }
    renderResults(input.value);
  }

  function closePanel() {
    open = false;
    resultsEl.hidden = true;
  }

  function choose(sp: Species) {
    species = sp;
    input.value = '';
    closePanel();
    selectedEl.hidden = false;
    root.querySelector<HTMLElement>('.sp-box')!.style.display = 'none';
    selectedEl.innerHTML = `
      <div class="sp-selected__head">
        <div>
          <span class="sp-selected__name">${esc(sp.display)}</span>
          <span class="sp-selected__id">${formatDexId(sp.id)} · Gen ${sp.gen}</span>
        </div>
        <span>${typeBadges(sp)}</span>
        <button type="button" class="btn btn--ghost btn--sm sp-selected__change">Change</button>
      </div>
      <dl class="sp-base">
        ${STAT_KEYS.map((k) => `<div><dt>${STAT_SHORT[k]}</dt><dd>${sp.base[k]}</dd></div>`).join('')}
      </dl>`;
    selectedEl.querySelector<HTMLButtonElement>('.sp-selected__change')!.addEventListener('click', () => {
      species = null;
      selectedEl.hidden = true;
      root.querySelector<HTMLElement>('.sp-box')!.style.display = '';
      input.value = '';
      input.focus();
      onSelect(null);
      openPanel();
    });
    onSelect(sp);
  }

  const search = debounce(() => {
    results = searchDex(dex, input.value, 24);
    active = results.length ? 0 : -1;
    if (open) renderResults(input.value);
  }, 70);

  input.addEventListener('focus', openPanel);
  input.addEventListener('input', search);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) openPanel();
      if (!results.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : results.length - 1)) % results.length;
      renderResults(input.value);
      resultsEl.querySelector('.sp-option.active')?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = active >= 0 ? results[active] : results[0];
      if (pick) choose(pick);
    } else if (e.key === 'Escape') {
      closePanel();
    }
  });

  resultsEl.addEventListener('mousedown', (e) => {
    const opt = (e.target as HTMLElement).closest<HTMLElement>('.sp-option');
    if (opt) {
      e.preventDefault();
      choose(results[Number(opt.dataset.i)]);
    }
  });

  document.addEventListener('click', (e) => {
    if (!root.contains(e.target as Node)) closePanel();
  });

  return {
    setSpecies(sp: Species | null) {
      if (sp) {
        choose(sp);
      } else {
        species = null;
        selectedEl.hidden = true;
        root.querySelector<HTMLElement>('.sp-box')!.style.display = '';
        onSelect(null);
      }
    },
    getSpecies: () => species,
  };
}
