const Storage = {
  key(level){ return `vocabquiz_done_${level}`; },

  getDoneMap(level){
    try {
      return JSON.parse(localStorage.getItem(Storage.key(level)) || "{}");
    } catch {
      return {};
    }
  },

  setDone(level, part, isDone){
    const map = Storage.getDoneMap(level);
    map[part] = !!isDone;
    localStorage.setItem(Storage.key(level), JSON.stringify(map));
  },

  resetLevel(level){
    localStorage.removeItem(Storage.key(level));
  }
};
