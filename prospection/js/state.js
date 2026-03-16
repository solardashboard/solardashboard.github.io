// Centralised mutable state — all modules read/write through this object.
const State = {
  leads:         [],
  savedIds:      new Set(),
  selectedId:    null,
  currentFilter: 'all',
  currentSearch: '',
};
