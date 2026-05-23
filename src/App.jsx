import { useState, useEffect } from "react";

const GNEWS_API_KEY = "d97884713f492fa4b5446fe175e5af00";
const SCORES_API_KEY = "ac02466bdcmsh5ac5d1975f027dcp196cb4jsn84b8845b8b8c";

const CATEGORIES = [
  { label: "À la une", query: "soccer OR \"Premier League\" OR \"La Liga\" OR \"Champions League\" OR \"Serie A\" OR \"Bundesliga\" -NFL -NBA -MLB -NHL" },
  { label: "Mercato", query: "transfer OR signing OR \"transfer fee\" soccer" },
  { label: "Ligue 1", query: "Ligue 1 OR PSG OR Marseille OR Monaco OR Lyon OR \"French football\"" },
  { label: "Premier League", query: "\"Premier League\" soccer -NFL -NBA" },
  { label: "Champions League", query: "\"Champions League\" UEFA soccer -NFL -NBA" },
  { label: "La Liga", query: "\"La Liga\" OR (Barcelona soccer) OR (\"Real Madrid\" soccer) -NFL -NBA" },
  { label: "Bundesliga", query: "\"Bundesliga\" OR (Bayern soccer) -NFL -NBA" },
  { label: "Serie A", query: "\"Serie A\" soccer Italy -NFL -NBA" },
  { label: "MLS", query: "\"Major League Soccer\" OR MLS soccer -NFL -NBA" },
];

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

function categoryEmoji(title = "", description = "") {
  const text = (title + description).toLowerCase();
  if (text.includes("transfer") || text.includes("sign") || text.includes("mercato")) return "🔄";
  if (text.includes("champion") || text.includes("ucl")) return "🏆";
  if (text.includes("goal") || text.includes("score") || text.includes("win")) return "⚽";
  if (text.includes("injury")) return "🏥";
  if (text.includes("manager") || text.includes("coach")) return "🎙️";
  return "📰";
}

const NAV_COLOR = "#00004d";
const ACCENT = "#cc0000";

export default function SoccerNewsApp() {
  const [activeCat, setActiveCat] = useState(CATEGORIES[0]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleContent, setArticleContent] = useState("");
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [liveScores, setLiveScores] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [tickerItems, setTickerItems] = useState([
    "Bienvenue sur FootFlash — L'actu foot en direct",
    "Champions League — Dernières infos en cours de chargement...",
    "Mercato — Les dernières rumeurs arrivent...",
  ]);

  useEffect(() => {
    const interval = setInterval(() => setTickerIndex(i => (i + 1) % tickerItems.length), 4000);
    return () => clearInterval(interval);
  }, [tickerItems]);

  useEffect(() => { fetchNews(activeCat); }, [activeCat]);
  useEffect(() => { fetchScores(); }, []);
  useEffect(() => { if (articles.length > 0) fetchTransfers(); }, [articles]);

  function getImage(article) { return article.image || article.urlToImage || null; }
  function getUrl(article) { return article.url; }
  function getSource(article) { return article.source?.name || article.source?.url || ""; }
  function getDate(article) { return article.publishedAt; }

  async function fetchNews(cat) {
    setLoading(true);
    setError(null);
    setSelectedArticle(null);
    try {
      const isLigue1 = cat.label === "Ligue 1";
      const lang = isLigue1 ? "fr" : "en";
      const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(cat.query)}&lang=${lang}&max=20&sortby=publishedAt&apikey=${GNEWS_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.articles) throw new Error(data.message || "Erreur de chargement");
      setArticles(data.articles);
      if (data.articles.length > 0) setTickerItems(data.articles.slice(0, 8).map(a => `▶ ${a.title}`));
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function fetchScores() {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`https://soccer-football-info.p.rapidapi.com/matches/by/date/?d=${today}&l=en`, {
        headers: { "x-rapidapi-host": "soccer-football-info.p.rapidapi.com", "x-rapidapi-key": SCORES_API_KEY },
      });
      const data = await res.json();
      const matches = (data.result || []).slice(0, 10).map(m => ({
        home: m.home?.name || "Home",
        away: m.away?.name || "Away",
        score: m.home?.score !== undefined ? `${m.home.score}-${m.away.score}` : "-",
        time: m.status?.name || m.time || "-",
        live: m.status?.code === 3,
        league: m.competition?.name || "",
      }));
      if (matches.length > 0) setLiveScores(matches);
    } catch {}
  }

  async function fetchTransfers() {
    try {
      const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent("soccer football transfer signing deal")}&lang=en&max=8&sortby=publishedAt&apikey=${GNEWS_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.articles?.length > 0) { setTransfers(data.articles); return; }
    } catch {}
    const fallback = articles.filter(a =>
      a.title?.toLowerCase().includes("transfer") || a.title?.toLowerCase().includes("sign") || a.title?.toLowerCase().includes("deal")
    ).slice(0, 6);
    setTransfers(fallback);
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setSelectedArticle(null);
    try {
      const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(searchQuery + " soccer football")}&lang=en&max=20&sortby=publishedAt&apikey=${GNEWS_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.articles) throw new Error(data.message || "Erreur de recherche");
      setArticles(data.articles || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function openArticle(article) {
    setSelectedArticle(article);
    setArticleContent("");
    setLoadingArticle(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: `Tu es un journaliste football. À partir de cet article, écris un développement journalistique en 3-4 paragraphes, dans le style de L'Équipe ou Foot Mercato. Titre: "${article.title}". Résumé: ${article.description || ""}. Texte brut uniquement, pas de markdown.` }],
        }),
      });
      const data = await response.json();
      setArticleContent(data.content?.map(c => c.text || "").join("\n") || "Impossible de charger l'article.");
    } catch { setArticleContent("Erreur de chargement."); }
    setLoadingArticle(false);
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#f0f0f0", minHeight: "100vh", color: "#222" }}>

      {/* Top bar */}
      <div style={{ background: NAV_COLOR, color: "#aac", fontSize: 11, padding: "4px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px", display: "flex", justifyContent: "space-between" }}>
          <span>⚽ FootFlash — L'actu foot en direct</span>
          <span>{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
      </div>

      {/* Header */}
      <header style={{ background: NAV_COLOR, borderBottom: `3px solid ${ACCENT}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>⚽</span>
            <div>
              <div style={{ fontWeight: 900, fontSize: 28, color: "#fff", letterSpacing: -1, lineHeight: 1 }}>
                FOOT<span style={{ color: ACCENT }}>FLASH</span>
              </div>
              <div style={{ fontSize: 9, color: "#889", letterSpacing: 2, textTransform: "uppercase" }}>L'actu foot en direct</div>
            </div>
          </div>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 6, flex: 1, maxWidth: 380 }}>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher joueurs, clubs, news..."
              style={{ flex: 1, padding: "7px 12px", borderRadius: 3, border: "none", fontSize: 13, outline: "none" }}
            />
            <button type="submit" style={{ background: ACCENT, border: "none", borderRadius: 3, padding: "7px 16px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              Rechercher
            </button>
          </form>
        </div>

        {/* Nav tabs */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px", display: "flex", overflowX: "auto" }}>
          {CATEGORIES.map(cat => (
            <button key={cat.label} onClick={() => { setActiveCat(cat); setSearchQuery(""); }}
              style={{
                background: "none", border: "none",
                borderBottom: activeCat.label === cat.label ? `3px solid ${ACCENT}` : "3px solid transparent",
                color: activeCat.label === cat.label ? "#fff" : "#99aacc",
                padding: "10px 14px", cursor: "pointer", fontSize: 12, fontWeight: activeCat.label === cat.label ? 700 : 400,
                textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap",
              }}>
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Live ticker */}
      <div style={{ background: ACCENT, padding: "5px 0", overflow: "hidden" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ background: "#fff", color: ACCENT, fontSize: 10, fontWeight: 900, padding: "2px 7px", borderRadius: 2, flexShrink: 0, letterSpacing: 1 }}>LIVE</span>
          <div key={tickerIndex} style={{ fontSize: 12, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {tickerItems[tickerIndex]}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px", display: "flex", gap: 16 }}>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {selectedArticle ? (
            // Article view
            <div style={{ background: "#fff", borderRadius: 4, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <button onClick={() => setSelectedArticle(null)} style={{
                background: "none", border: "none", color: ACCENT, cursor: "pointer",
                fontSize: 13, marginBottom: 16, padding: 0, fontWeight: 700,
              }}>← Retour aux articles</button>
              {getImage(selectedArticle) && (
                <img src={getImage(selectedArticle)} alt="" style={{ width: "100%", maxHeight: 300, objectFit: "cover", borderRadius: 3, marginBottom: 16 }} onError={e => e.target.style.display = "none"} />
              )}
              <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                {getSource(selectedArticle)} · {timeAgo(getDate(selectedArticle))}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.3, marginBottom: 12, color: "#111" }}>{selectedArticle.title}</h1>
              {loadingArticle ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#888" }}>
                  <div style={{ fontSize: 28, animation: "spin 1s linear infinite", display: "inline-block" }}>⚽</div>
                  <div style={{ marginTop: 12, fontSize: 13 }}>Chargement de l'article...</div>
                </div>
              ) : (
                <>
                  <div style={{ lineHeight: 1.8, fontSize: 15, color: "#333" }}>
                    {articleContent.split("\n\n").map((p, i) => <p key={i} style={{ marginBottom: 16 }}>{p}</p>)}
                  </div>
                  <a href={getUrl(selectedArticle)} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-block", marginTop: 16, color: ACCENT, fontSize: 13, fontWeight: 700 }}>
                    Lire l'article original sur {getSource(selectedArticle)} →
                  </a>
                </>
              )}
            </div>
          ) : loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
              <div style={{ fontSize: 32, animation: "spin 1s linear infinite", display: "inline-block" }}>⚽</div>
              <div style={{ marginTop: 12 }}>Chargement des articles...</div>
            </div>
          ) : error ? (
            <div style={{ background: "#fff", borderRadius: 4, padding: 24, textAlign: "center", color: ACCENT }}>
              <div>⚠️ {error}</div>
              <button onClick={() => fetchNews(activeCat)} style={{ marginTop: 12, background: ACCENT, border: "none", borderRadius: 3, padding: "8px 20px", color: "#fff", cursor: "pointer" }}>Réessayer</button>
            </div>
          ) : (
            <div>
              {/* Featured article */}
              {articles.length > 0 && (
                <div onClick={() => openArticle(articles[0])} style={{
                  background: "#fff", borderRadius: 4, marginBottom: 12, cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden",
                  borderLeft: `4px solid ${ACCENT}`,
                  display: "flex", gap: 0,
                }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)"}
                >
                  {getImage(articles[0]) && (
                    <img src={getImage(articles[0])} alt="" style={{ width: 220, height: 140, objectFit: "cover", flexShrink: 0 }} onError={e => e.target.style.display = "none"} />
                  )}
                  <div style={{ padding: "16px 20px", flex: 1 }}>
                    <div style={{ fontSize: 10, color: ACCENT, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                      🔥 À LA UNE · {getSource(articles[0])} · {timeAgo(getDate(articles[0]))}
                    </div>
                    <h2 style={{ fontSize: 18, fontWeight: 900, color: "#111", lineHeight: 1.3, marginBottom: 8 }}>{articles[0].title}</h2>
                    <p style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>{articles[0].description?.slice(0, 150)}{articles[0].description?.length > 150 ? "..." : ""}</p>
                  </div>
                </div>
              )}

              {/* Article list — compact Maxifoot style */}
              <div style={{ background: "#fff", borderRadius: 4, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
                <div style={{ background: NAV_COLOR, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
                    {activeCat.label}
                  </span>
                  <span style={{ color: "#667", fontSize: 11 }}>— {articles.length - 1} articles</span>
                </div>
                {articles.slice(1).map((article, i) => (
                  <div key={i} onClick={() => openArticle(article)}
                    style={{
                      cursor: "pointer",
                      display: "flex", gap: 12, alignItems: "flex-start",
                      padding: "10px 14px",
                      borderBottom: "1px solid #f0f0f0",
                      background: i % 2 === 0 ? "#fff" : "#fafafa",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f0f4ff"}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa"}
                  >
                    {getImage(article) && (
                      <img src={getImage(article)} alt="" style={{ width: 80, height: 55, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} onError={e => e.target.style.display = "none"} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: ACCENT, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>
                        {categoryEmoji(article.title, article.description)} {getSource(article)} · {timeAgo(getDate(article))}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#111", lineHeight: 1.3, marginBottom: 3 }}>
                        {article.title}
                      </div>
                      <div style={{ fontSize: 12, color: "#888", lineHeight: 1.4 }}>
                        {article.description?.slice(0, 100)}{article.description?.length > 100 ? "..." : ""}
                      </div>
                    </div>
                  </div>
                ))}
                {articles.length === 0 && (
                  <div style={{ padding: "40px", textAlign: "center", color: "#888", fontSize: 14 }}>Aucun article trouvé.</div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside style={{ width: 260, flexShrink: 0 }}>

          {/* Live Scores */}
          <div style={{ background: "#fff", borderRadius: 4, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <div style={{ background: NAV_COLOR, padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2ecc40", display: "inline-block", boxShadow: "0 0 5px #2ecc40" }}></span>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Scores du jour</span>
              </div>
              <button onClick={fetchScores} style={{ background: "none", border: "none", color: "#889", cursor: "pointer", fontSize: 13 }}>↻</button>
            </div>
            {liveScores.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#aaa", fontSize: 12 }}>Aucun match aujourd'hui</div>
            ) : liveScores.map((m, i) => (
              <div key={i} style={{ padding: "8px 14px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 600, textAlign: "right", color: "#222" }}>{m.home}</div>
                <div style={{ textAlign: "center", minWidth: 60 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: m.live ? ACCENT : "#222", fontFamily: "monospace" }}>{m.score}</div>
                  <div style={{ fontSize: 9, color: m.live ? "#2ecc40" : "#aaa", fontWeight: 700 }}>{m.time}</div>
                </div>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#222" }}>{m.away}</div>
              </div>
            ))}
          </div>

          {/* Transfer Rumours */}
          <div style={{ background: "#fff", borderRadius: 4, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <div style={{ background: NAV_COLOR, padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>🔄 Mercato</span>
              <button onClick={fetchTransfers} style={{ background: "none", border: "none", color: "#889", cursor: "pointer", fontSize: 13 }}>↻</button>
            </div>
            {transfers.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#aaa", fontSize: 12 }}>Aucune rumeur</div>
            ) : transfers.map((t, i) => (
              <a key={i} href={t.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{
                  padding: "9px 14px", borderBottom: "1px solid #f0f0f0",
                  background: "#fff", cursor: "pointer",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f0f4ff"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#111", lineHeight: 1.3, marginBottom: 3 }}>
                    {t.title?.slice(0, 75)}{t.title?.length > 75 ? "..." : ""}
                  </div>
                  <div style={{ fontSize: 10, color: ACCENT, fontWeight: 700 }}>
                    {getSource(t)} · {timeAgo(getDate(t))}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #eee; }
        ::-webkit-scrollbar-thumb { background: #bbb; border-radius: 3px; }
        input::placeholder { color: #999; }
        body { background: #f0f0f0; }
      `}</style>
    </div>
  );
}
