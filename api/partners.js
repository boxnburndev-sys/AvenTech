import { seatableGetBaseToken, seatableListRows } from "../db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const serverUrl = process.env.SEATABLE_SERVER_URL || "https://cloud.seatable.io";
  const apiToken = process.env.SEATABLE_API_TOKEN || "";
  const tableName = process.env.SEATABLE_TABLE_NAME || "Partners";
  const viewName = process.env.SEATABLE_VIEW_NAME || "";

  if (!apiToken) {
    res.status(500).json({ error: "Missing SEATABLE_API_TOKEN" });
    return;
  }

  try {
    const { accessToken, baseUuid } = await seatableGetBaseToken({ serverUrl, apiToken });
    const rowsData = await seatableListRows({ serverUrl, accessToken, baseUuid, tableName, viewName });
    const rows = Array.isArray(rowsData?.rows) ? rowsData.rows : [];
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.status(200).json({ rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to load partners" });
  }
}
