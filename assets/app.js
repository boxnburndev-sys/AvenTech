function setupActiveNav() {
  const page = document.body.getAttribute("data-page") || "";
  document.querySelectorAll("[data-nav]").forEach((a) => {
    if ((a.getAttribute("data-nav") || "") === page) a.classList.add("active");
  });
}

function setupMobileMenu() {
  const btn = document.querySelector("[data-mobile-toggle]");
  const panel = document.querySelector("[data-mobile-panel]");
  if (!btn || !panel) return;
  btn.addEventListener("click", () => {
    panel.classList.toggle("open");
    btn.setAttribute("aria-expanded", panel.classList.contains("open") ? "true" : "false");
  });
  panel.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => panel.classList.remove("open")));
}

function setYear() {
  const y = document.getElementById("y");
  if (y) y.textContent = new Date().getFullYear();
}

function setupContactForm() {
  const form = document.querySelector("[data-web3form]");
  if (!form) return;

  const keyInput = form.querySelector('input[name="access_key"]');
  const status = document.querySelector("[data-form-status]");
  const btn = form.querySelector('button[type="submit"]');

  const accessKey = keyInput?.value?.trim();
  if (!accessKey || accessKey === "3ffced50-69c6-4348-adfb-1f1b1d2bb1db") {
    if (status) {
      status.className = "notice bad";
      status.innerHTML = "<b>Instellen:</b> Voeg je Web3Forms access key toe om het formulier te activeren.";
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!status) return;

    status.className = "notice";
    status.textContent = "Verzenden…";
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = ".85";
    }

    const payload = new FormData(form);

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: payload
      });
      const data = await res.json();
      if (data.success) {
        status.className = "notice ok";
        status.innerHTML = "<b>Verzonden.</b> We nemen snel contact op.";
        form.reset();
      } else {
        status.className = "notice bad";
        status.innerHTML = "<b>Niet gelukt.</b> Probeer opnieuw of stuur ons een e-mail.";
      }
    } catch (err) {
      status.className = "notice bad";
      status.innerHTML = "<b>Netwerkfout.</b> Probeer opnieuw of stuur ons een e-mail.";
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = "1";
      }
    }
  });
}

async function seatableGetBaseToken({ serverUrl, apiToken }) {
  const url = `${serverUrl.replace(/\/$/, "")}/api/v2.1/dtable/app-access-token/`;
  const res = await fetch(url, { method: "GET", headers: { Authorization: `Token ${apiToken}` } });
  if (!res.ok) throw new Error("SeaTable auth mislukt");
  const data = await res.json();
  if (!data || !data.access_token || !data.dtable_uuid) throw new Error("SeaTable auth antwoord ongeldig");
  return { accessToken: data.access_token, baseUuid: data.dtable_uuid };
}

async function seatableListRows({ serverUrl, accessToken, baseUuid, tableName, viewName }) {
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

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  });
  children.forEach((c) => node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
  return node;
}

function normalizeTagList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  return String(raw).split(",").map((s) => s.trim()).filter(Boolean);
}

function renderPartnerCard(row) {
  const name = row.Naam || row.Name || "Partner";
  const description = row.Beschrijving || row.Description || "";
  const website = row.Website || row.URL || row.Url || row.website || "";
  const type = row.Type || "";
  const tags = normalizeTagList(row.Tags || row.labels || row.Labels);

  const title = el("h4", {}, [String(name)]);
  const desc = description ? el("p", {}, [String(description)]) : null;

  const tagWrap = el("div", { class: "tags" }, []);
  if (type) tagWrap.appendChild(el("span", { class: "tag" }, [String(type)]));
  tags.forEach((t) => tagWrap.appendChild(el("span", { class: "tag" }, [String(t)])));

  const top = el("div", { class: "partnerTop" }, [
    el("div", { class: "avatar", "aria-hidden": "true" }),
    el("div", {}, [title])
  ]);

  const link = website
    ? el("a", { class: "btn", href: String(website), target: "_blank", rel: "noopener noreferrer", style: "margin-top:10px; justify-content:flex-start" }, ["Website"])
    : null;

  const card = el("div", { class: "partner" }, [top]);
  if (desc) card.appendChild(desc);
  if (type || tags.length) card.appendChild(tagWrap);
  if (link) card.appendChild(link);
  return card;
}

async function setupPartnersFromSeaTable() {
  const root = document.querySelector("[data-seatable-partners]");
  if (!root) return;

  const status = document.querySelector("[data-partners-status]");
  const currentWrap = document.querySelector("[data-partners-current]");
  const pastWrap = document.querySelector("[data-partners-past]");

  const serverUrl = root.getAttribute("data-server-url") || "";
  const apiToken = root.getAttribute("data-api-token") || "";
  const tableName = root.getAttribute("data-table-name") || "Partners";
  const viewName = root.getAttribute("data-view-name") || "";
  const currentValue = root.getAttribute("data-current-value") || "Actueel";
  const pastValue = root.getAttribute("data-past-value") || "Eerder";

  if (!serverUrl || !apiToken) {
    if (status) {
      status.className = "notice bad";
      status.innerHTML = "<b>Instellen:</b> Voeg je SeaTable server url en API token toe om partners te laden.";
    }
    return;
  }

  try {
    if (status) {
      status.className = "notice";
      status.textContent = "Laden…";
    }

    const { accessToken, baseUuid } = await seatableGetBaseToken({ serverUrl, apiToken });
    const rowsData = await seatableListRows({ serverUrl, accessToken, baseUuid, tableName, viewName });
    const rows = Array.isArray(rowsData?.rows) ? rowsData.rows : [];

    const current = [];
    const past = [];

    rows.forEach((r) => {
      const kind = String(r.Status || r.Categorie || r.Category || r.status || "").trim();
      if (kind.toLowerCase() === currentValue.toLowerCase()) current.push(r);
      else if (kind.toLowerCase() === pastValue.toLowerCase()) past.push(r);
      else current.push(r);
    });

    if (currentWrap) {
      currentWrap.innerHTML = "";
      current.forEach((r) => currentWrap.appendChild(renderPartnerCard(r)));
    }

    if (pastWrap) {
      pastWrap.innerHTML = "";
      past.forEach((r) => pastWrap.appendChild(renderPartnerCard(r)));
    }

    if (status) {
      status.className = "notice ok";
      status.innerHTML = "<b>Klaar.</b> De lijst is bijgewerkt.";
    }
  } catch (e) {
    if (status) {
      status.className = "notice bad";
      status.innerHTML = "<b>Niet gelukt.</b> Controleer SeaTable instellingen en CORS.";
    }
  }
}

setupActiveNav();
setupMobileMenu();
setupContactForm();
setupPartnersFromSeaTable();
setYear();
