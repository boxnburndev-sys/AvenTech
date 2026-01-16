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
      status.innerHTML = "";
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!status) return;

    status.className = "notice";
    status.textContent = "Verzenden…";
    if (btn) { btn.disabled = true; btn.style.opacity = ".85"; }

    const payload = new FormData(form);

    try {
      const res = await fetch("https://api.web3forms.com/submit", { method: "POST", body: payload });
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
      if (btn) { btn.disabled = false; btn.style.opacity = "1"; }
    }
  });
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

function normalizeUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

function pickFirstImageUrl(raw) {
  if (!raw) return "";
  if (typeof raw === "string") return raw.trim();

  if (Array.isArray(raw)) {
    const first = raw[0];
    if (!first) return "";
    if (typeof first === "string") return first.trim();
    if (typeof first === "object") {
      return String(first.url || first.download_link || first.link || first.src || "").trim();
    }
    return "";
  }

  if (typeof raw === "object") {
    return String(raw.url || raw.download_link || raw.link || raw.src || "").trim();
  }

  return "";
}

function isGraphicalWork(type) {
  const t = String(type || "").trim().toLowerCase();
  return t === "graphical work" || t === "grafisch werk" || t === "grafisch" || t === "design";
}

function renderPartnerCard(row) {
  const name = row.Naam || row.name || row.Name || "Partner";
  const description = (row.Beschrijving || row.description || row.Description || "").toString().trim();
  const websiteRaw = row.Website || row.website || row.URL || row.url || "";
  const website = normalizeUrl(websiteRaw);
  const status = (row.Status || row.status || "").toString().trim();
  const type = (row.Type || row.type || "").toString().trim();
  const tags = normalizeTagList(row.Tags || row.tags || row.labels || row.Labels);
  const imageUrl = pickFirstImageUrl(row.Image || row.image);

  const card = el("div", { class: "partner" }, [
    el("h4", {}, [String(name)])
  ]);

  if (description) card.appendChild(el("p", {}, [description]));

  const tagWrap = el("div", { class: "tags" }, []);
  if (status) tagWrap.appendChild(el("span", { class: "tag" }, [status]));
  if (type) tagWrap.appendChild(el("span", { class: "tag" }, [type]));
  tags.forEach((t) => tagWrap.appendChild(el("span", { class: "tag" }, [String(t)])));
  if (status || type || tags.length) card.appendChild(tagWrap);

  if (isGraphicalWork(type) && imageUrl) {
    card.appendChild(
      el("img", {
        src: imageUrl,
        alt: String(name),
        style: "width:100%;border-radius:12px;border:1px solid var(--stroke);background:var(--panel2)"
      })
    );
  }

  if (website) {
    card.appendChild(
      el("a", {
        class: "btn",
        href: website,
        target: "_blank",
        rel: "noopener noreferrer",
        style: "margin-top:10px; justify-content:flex-start"
      }, ["Website"])
    );
  }

  return card;
}

async function setupPartnersFromApi() {
  const root = document.querySelector("[data-partners]");
  if (!root) return;

  const statusEl = document.querySelector("[data-partners-status]");
  const currentWrap = document.querySelector("[data-partners-current]");
  const pastWrap = document.querySelector("[data-partners-past]");

  const currentValue = root.getAttribute("data-current-value") || "Online";
  const pastValue = root.getAttribute("data-past-value") || "Offline";

  try {
    if (statusEl) { statusEl.className = "notice"; statusEl.textContent = "Laden…"; }

    const res = await fetch("/api/partners", { method: "GET" });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    const rows = Array.isArray(data?.rows) ? data.rows : [];

    const current = [];
    const past = [];

    rows.forEach((r) => {
      const kind = String(r.Status || r.status || "").trim();
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

    if (statusEl) { statusEl.className = "notice ok"; statusEl.innerHTML = "<b>Klaar.</b> Partners zijn bijgewerkt."; }
  } catch (e) {
    if (statusEl) { statusEl.className = "notice bad"; statusEl.innerHTML = "<b>Niet gelukt.</b> Controleer de API en SeaTable instellingen."; }
  }
}

setupActiveNav();
setupMobileMenu();
setupContactForm();
setupPartnersFromApi();
setYear();
