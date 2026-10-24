// 妄想のタネ。未来のこと（/mirai/futures.json）と自分の偏愛から、問いとAIに貼る文を作る
// 入れたものは localStorage にだけ残す。外には何も送らない
const FUTURES_URL = "https://mousou-lp.github.io/mirai/futures.json";
const REQUEST_URL = "https://github.com/mousou-lp/mousou-lp.github.io/issues/new";
const STORE = "mousou-tane";
const MOTTO =
  "未来の技術と自分の偏愛から、架空のサービスを妄想する。その未来を考えることで、いまの自分の生き方に干渉して、ポジティブな変化を起こす。";

// {love} に偏愛が入る。どの未来にも使える問い
const QUESTIONS = [
  "この未来がきたら、「{love}」の楽しみ方はどう変わる？",
  "「{love}」のいちばん面倒なところを、この未来が引き受けてくれたら？",
  "「{love}」が好きな人どうしが、この未来でつながるとしたら、どこで、どうやって？",
  "「{love}」をまだ知らない人に、この未来を使って手渡すとしたら？",
  "この未来で、「{love}」がなくなりそうになったら、どうやって守る？",
  "子どものころの自分に「{love}」を見せるなら、この未来をどう使う？",
  "「{love}」のために、毎日5分だけこの未来を使えるとしたら？",
];

const $ = (s) => document.querySelector(s);
const state = load();
let futures = [];
let questionOffset = 0;

init();

async function init() {
  const love = $("[data-love]");
  const idea = $("[data-idea]");
  love.value = state.love ?? "";
  idea.value = state.idea ?? "";

  love.addEventListener("input", () => save({ love: love.value.trim() }));
  idea.addEventListener("input", () => save({ idea: idea.value }));
  document.querySelectorAll("[data-hint]").forEach((b) =>
    b.addEventListener("click", () => {
      love.value = b.textContent;
      save({ love: love.value });
    }),
  );
  $("[data-random]").addEventListener("click", () => {
    if (!futures.length) return;
    const others = futures.filter((f) => f.slug !== state.future);
    const pick = others[Math.floor(Math.random() * others.length)];
    save({ future: pick.slug });
    renderChoices();
    document.getElementById(`future-${pick.slug}`)?.focus();
  });
  $("[data-shuffle]").addEventListener("click", () => {
    questionOffset += 3;
    render();
  });
  $("[data-copy]").addEventListener("click", copyPrompt);

  try {
    const res = await fetch(FUTURES_URL);
    if (!res.ok) throw new Error(res.status);
    futures = await res.json();
    renderChoices();
  } catch {
    $("[data-futures-status]").textContent = "未来のことを読みこめませんでした。ページを開きなおしてみてください。";
  }
  render();
}

function renderChoices() {
  const box = $("[data-futures]");
  box.replaceChildren(
    ...futures.map((f) => {
      const label = document.createElement("label");
      label.className = "choice";
      label.innerHTML = `
        <input class="choice__input" type="radio" name="future" />
        <span class="choice__body">
          <span class="choice__title"></span>
          <span class="choice__meta"></span>
        </span>`;
      label.querySelector(".choice__title").textContent = f.title;
      label.querySelector(".choice__meta").textContent = `${f.area}・${f.when}`;
      const input = label.querySelector("input");
      input.id = `future-${f.slug}`;
      input.value = f.slug;
      input.checked = f.slug === state.future;
      input.addEventListener("change", () => save({ future: f.slug }));
      return label;
    }),
  );
}

function render() {
  const future = futures.find((f) => f.slug === state.future);
  const love = state.love?.trim();
  const ready = Boolean(future && love);
  $("[data-result]").hidden = !ready;
  $("[data-result-empty]").hidden = ready;
  if (!ready) return;

  $("[data-pair-future]").textContent = future.title;
  $("[data-pair-love]").textContent = love;

  // その未来の妄想のタネを先に、あとは共通の問いから3つずつ
  const general = QUESTIONS.map((q) => q.replaceAll("{love}", love));
  const picked = Array.from({ length: 3 }, (_, i) => general[(questionOffset + i) % general.length]);
  const list = $("[data-questions]");
  list.replaceChildren(
    ...[...picked, ...future.seeds.slice(0, 2)].map((q) => {
      const li = document.createElement("li");
      li.textContent = q;
      return li;
    }),
  );

  $("[data-prompt]").value = promptFor(future, love);
  $("[data-request]").href = requestUrl(future, love);
}

function promptFor(f, love) {
  return `架空のサービスを、いっしょに妄想してください。

妄想LPのモットー：${MOTTO}

未来：${f.title}（${f.when}）
${f.summary}

わたしの偏愛：${love}

この未来と、わたしの偏愛をかけあわせた架空のサービスを3つ考えてください。それぞれに、次の4つを書いてください。
・サービスの名前
・だれの、どんな気持ちにこたえるか
・何ができるか（3行まで）
・LPの見出しにするなら、どんな1文か

最後に、この妄想から、いまのわたしが明日からやってみられる小さなことを1つ教えてください。`;
}

// GitHubのIssueの用紙は、URLに欄のidを付けると中身が入った状態で開く
function requestUrl(f, love) {
  const idea = (state.idea ?? "").trim();
  const params = new URLSearchParams({
    template: "lp-request.yml",
    title: `LPのリクエスト: ${idea ? idea.slice(0, 30) : `${love}×${f.title}`}`,
    idea: idea || `「${f.title}」未来と、「${love}」をかけあわせたサービス`,
    more: `妄想のタネから。未来：${f.title}（https://mousou-lp.github.io/mirai/${f.slug}/）、偏愛：${love}`,
  });
  return `${REQUEST_URL}?${params}`;
}

async function copyPrompt() {
  const text = $("[data-prompt]").value;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    $("[data-prompt]").select();
    document.execCommand("copy");
  }
  const note = $("[data-copied]");
  note.hidden = false;
  setTimeout(() => (note.hidden = true), 2000);
}

function save(patch) {
  Object.assign(state, patch);
  try {
    localStorage.setItem(STORE, JSON.stringify(state));
  } catch {}
  render();
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORE)) ?? {};
  } catch {
    return {};
  }
}
