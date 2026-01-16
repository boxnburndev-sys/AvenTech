let fetchFn = globalThis.fetch;

async function getFetch() {
  if (fetchFn) return fetchFn;
  try {
    const mod = await import("node-fetch");
    fetchFn = mod.default;
    return fetchFn;
  } catch (e) {
    throw new Error("fetch ontbreekt in runtime en node-fetch is niet beschikbaar");
  }
}

async function seatableGetBaseToken({ serverUrl, apiToken }) {
  const fetch = await getFetch();
  const url = `${serverUrl.replace(/\/$/, "")}/api/v2.1/dtable/app-access-token/`;
  const res = await fetch(url, { method: "GET", headers: { Authorization: `Token ${apiToken}` } });
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`SeaTable auth ${res.status}: ${text}`);
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("SeaTable auth JSON parse error"); }
  if (!data?.access_token || !data?.dtable_uuid) throw new Error("SeaTable auth antwoord mist access_token/dtable_uuid");
  return { accessToken: data.access_token, baseUuid: data.dtable_uuid };
}

async function seatableListRows({ serverUrl, accessToken, baseUuid, tableName, viewName }) {
  const fetch = await getFetch();
  const base = serverUrl.replace(/\/$/, "");
  const qs = new URLSearchParams();
  if (viewName) qs.set("view_name", viewName);
  qs.set("limit", "200");
  qs.set("convert_keys", "true");
  const url = `${base}/dtable-server/api/v1/dtables/${encodeURIComponent(baseUuid)}/rows/?table_name=${encodeURIComponent(tableName)}&${qs.toString()}`;
  const res = await fetch(url, { method: "GET", headers: { Authorization: `Token ${accessToken}` } });
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`SeaTable rows ${res.status}: ${text}`);
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("SeaTable rows JSON parse error"); }
  return data;
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  try {
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    const serverUrl = process.env.SEATABLE_SERVER_URL || "https://cloud.seatable.io";
    const apiToken = process.env.SEATABLE_API_TOKEN || "";
    const tableName = process.env.SEATABLE_TABLE_NAME || "Partners";
    const viewName = process.env.SEATABLE_VIEW_NAME || "";

    if (!apiToken) {
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: "Missing SEATABLE_API_TOKEN",
        debug: { serverUrl, tableName, viewName, hasToken: false }
      }));
      return;
    }

    const { accessToken, baseUuid } = await seatableGetBaseToken({ serverUrl, apiToken });
    const rowsData = await seatableListRows({ serverUrl, accessToken, baseUuid, tableName, viewName });
    const rows = Array.isArray(rowsData?.rows) ? rowsData.rows : [];

    res.statusCode = 200;
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.end(JSON.stringify({
      ok: true,
      debug: { serverUrl, tableName, viewName, hasToken: true, baseUuidPresent: !!baseUuid },
      rows
    }));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({
      ok: false,
      error: String(e?.message || e),
      debug: {
        node: process.version,
        hasFetch: !!globalThis.fetch
      }
    }));
  }
};
