const SORT_MODES = ['newest', 'popular', 'discussed'];

function normalizeSortMode(mode = 'newest') {
  const clean = String(mode || 'newest').trim().toLowerCase();
  return SORT_MODES.includes(clean) ? clean : 'newest';
}

function getTimestamp(pin) {
  const parsed = Date.parse(pin.createdAt || '');
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getCommentsCount(pin) {
  return Array.isArray(pin.comments) ? pin.comments.length : 0;
}

function sortPins(pins = [], mode = 'newest') {
  const sortMode = normalizeSortMode(mode);
  const copy = [...pins];

  if (sortMode === 'popular') {
    return copy.sort((a, b) => {
      const likeDiff = (b.likes || 0) - (a.likes || 0);
      if (likeDiff !== 0) return likeDiff;
      const commentDiff = getCommentsCount(b) - getCommentsCount(a);
      if (commentDiff !== 0) return commentDiff;
      return (b.id || 0) - (a.id || 0);
    });
  }

  if (sortMode === 'discussed') {
    return copy.sort((a, b) => {
      const commentDiff = getCommentsCount(b) - getCommentsCount(a);
      if (commentDiff !== 0) return commentDiff;
      const likeDiff = (b.likes || 0) - (a.likes || 0);
      if (likeDiff !== 0) return likeDiff;
      return (b.id || 0) - (a.id || 0);
    });
  }

  return copy.sort((a, b) => {
    const idDiff = (b.id || 0) - (a.id || 0);
    if (idDiff !== 0) return idDiff;
    return getTimestamp(b) - getTimestamp(a);
  });
}

module.exports = {
  SORT_MODES,
  normalizeSortMode,
  sortPins
};
