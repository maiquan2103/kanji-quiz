const App = {
  getQuery(key){
    const url = new URL(location.href);
    return url.searchParams.get(key);
  },

  async loadJSON(path){
    const res = await fetch(path, { cache: "no-store" });
    if(!res.ok) throw new Error(`Không load được ${path}`);
    return await res.json();
  },

  shuffle(arr){
    // Fisher-Yates
    for(let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  pickRandom(arr, n){
    const copy = [...arr];
    App.shuffle(copy);
    return copy.slice(0, n);
  }
};
