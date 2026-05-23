export default async function handler(req, res) {
  const { q, lang } = req.query;
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=${lang || 'en'}&max=20&sortby=publishedAt&apikey=d97884713f492fa4b5446fe175e5af00`;
  const response = await fetch(url);
  const data = await response.json();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(data);
}
