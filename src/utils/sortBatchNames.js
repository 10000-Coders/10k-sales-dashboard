/**
 * Sort batch names: numeric batches (1r, 2r) first, then d-batches (d1r, d2r), then others alphabetically.
 */
export function sortBatchNames(batchNames) {
  if (!Array.isArray(batchNames)) return [];
  const withKeys = batchNames.map((name) => {
    const s = String(name);
    const d = /^d(\d+)r$/i.exec(s);
    if (d) return { name, type: 1, num: parseInt(d[1], 10) };
    const r = /^(\d+)r$/i.exec(s);
    if (r) return { name, type: 0, num: parseInt(r[1], 10) };
    return { name, type: 2 };
  });
  withKeys.sort((a, b) => {
    if (a.type !== b.type) return a.type - b.type;
    if (a.type !== 2) return a.num - b.num;
    return String(a.name).localeCompare(String(b.name));
  });
  return withKeys.map((x) => x.name);
}

export function sortUniqueBatchNames(names) {
  return sortBatchNames([...new Set(names.filter(Boolean))]);
}
