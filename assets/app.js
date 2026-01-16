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
  if (!accessKey || accessKey === "PLAK_HIER_JE_WEB3FORMS_SLEUTEL") {
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

function renderPartnerCard(row) {
  const name = row.naam || row.Naam || row.name || row.Name || "Partner";
  const description = row.beschrijving || row.Beschrijving || row.description || row.Description || "";
  const website = row.website || row.Website || row.url || row.URL || row.Url || "";
  const type = row.type || row.Type || "";
  const tags = normalizeTagList(row.tags || row.Tags || row.labels || row.Labels);

  const card = el("div", { class: "partner" }, [
    el("h4", {}, [String(name)])
  ]);

  if (description) card.appendChild(el("p", {}, [String(description)]));

  const tagWrap = el("div", { class: "tags" }, []);
  if (type) tagWrap.appendChild(el("span", { class: "tag" }, [String(type)]));
  tags.forEach((t) => tagWrap.appendChild(el("span", { class: "tag" }, [String(t)])));
  if (type || tags.length) card.appendChild(tagWrap);

  if (website) {
    card.appendChild(
      el("a", {
        class: "btn",
        href: String(website),
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

  const status = document.querySelector("[data-partners-status]");
  const currentWrap = document.querySelector("[data-partners-current]");
  const pastWrap = document.querySelector("[data-partners-past]");

  const currentValue = root.getAttribute("data-current-value") || "Actueel";
  const pastValue = root.getAttribute("data-past-value") || "Eerder";

  try {
    if (status) { status.className = "notice"; status.textContent = "Laden…"; }

    const res = await fetch("/api/partners", { method: "GET" });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    const rows = Array.isArray(data?.rows) ? data.rows : [];

    const current = [];
    const past = [];

    rows.forEach((r) => {
      const kind = String(r.status || r.Status || r.categorie || r.Categorie || r.category || r.Category || "").trim();
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

    if (status) { status.className = "notice ok"; status.innerHTML = "<b>Klaar.</b> De lijst is bijgewerkt."; }
  } catch (e) {
    if (status) { status.className = "notice bad"; status.innerHTML = "<b>Niet gelukt.</b> Controleer Vercel ENV en SeaTable instellingen."; }
  }
}

setupActiveNav();
setupMobileMenu();
setupContactForm();
setupPartnersFromApi();
setYear();
