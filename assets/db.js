export async function seatableGetBaseToken({ serverUrl, apiToken }) {
  const url = `${serverUrl.replace(/\/$/, "")}/api/v2.1/dtable/app-access-token/`;
  const res = await fetch(url, { method: "GET", headers: { Authorization: `Token ${apiToken}` } });
  if (!res.ok) throw new Error("SeaTable auth mislukt");
  const data = await res.json();
  if (!data?.access_token || !data?.dtable_uuid) throw new Error("SeaTable auth antwoord ongeldig");
  return { accessToken: data.access_token, baseUuid: data.dtable_uuid };
}

export async function seatableListRows({ serverUrl, accessToken, baseUuid, tableName, viewName }) {
  const base = serverUrl.replace(/\/$/, "");
  const qs = new URLSearchParams();
  if (viewName) qs.set("view_name", viewName);
  qs.set("limit", "200");
  qs.set("convert_keys", "true");
  const url = `${base}/dtable-server/api/v1/dtables/${encodeURIComponent(baseUuid)}/rows/?table_name=${encodeURIComponent(tableName)}&${qs.toString()}`;
  const res = await fetch(url, { method: "GET", headers: { Authorization: `Token ${accessToken}` } });
  if (!res.ok) throw new Error("SeaTable rijen ophalen mislukt");
  return await res.json();
}
