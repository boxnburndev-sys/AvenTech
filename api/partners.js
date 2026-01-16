async function seatableGetBaseToken({ serverUrl, apiToken }) {
  const url = `${serverUrl.replace(/\/$/, "")}/api/v2.1/dtable/app-access-token/`;
  const res = await fetch(url, { method: "GET", headers: { Authorization: `Token ${apiToken}` } });
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`SeaTable auth ${res.status}: ${text}`);
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("SeaTable auth JSON parse error"); }
  if (!data?.access_token || !data?.dtable_uuid) throw new Error("SeaTable auth antwoord mist access_token/dtable_uuid");
  return { accessToken: data.access_token, baseUuid: data.dtable_uuid };
}

async function seatableListRowsGateway({ serverUrl, accessToken, baseUuid, tableName, viewName }) {
  const base = serverUrl.replace(/\/$/, "");
  const qs = new URLSearchParams();
  qs.set("table_name", tableName);
  if (viewName) qs.set("view_name", viewName);
  qs.set("limit", "200");
  qs.set("convert_keys", "true");

  const url = `${base}/api-gateway/api/v2/dtables/${encodeURIComponent(baseUuid)}/rows/?${qs.toString()}`;
  const res = await fetch(url, { method: "GET", headers: { Authorization: `Token ${accessToken}` } });
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`SeaTable gateway rows ${res.status}: ${text}`);
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("SeaTable gateway rows JSON parse error"); }
  return data;
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  try {
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
      return;
    }

    const serverUrl = process.env.SEATABLE_SERVER_URL || "https://cloud.seatable.io";
    const apiToken = process.env.SEATABLE_API_TOKEN || "";
    const tableName = process.env.SEATABLE_TABLE_NAME || "Partners";
    const viewName = process.env.SEATABLE_VIEW_NAME || "";

    if (!apiToken) {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: "Missing SEATABLE_API_TOKEN" }));
      return;
    }

    const { accessToken, baseUuid } = await seatableGetBaseToken({ serverUrl, apiToken });
    const rowsData = await seatableListRowsGateway({ serverUrl, accessToken, baseUuid, tableName, viewName });
    const rows = Array.isArray(rowsData?.rows) ? rowsData.rows : [];

    res.statusCode = 200;
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.end(JSON.stringify({ ok: true, rows }));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: String(e?.message || e) }));
  }
};
