function setActiveNav(){
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll("[data-nav]").forEach(a=>{
    const href = (a.getAttribute("href") || "").toLowerCase();
    if(href === path) a.classList.add("active");
  });
}

function setupMobileMenu(){
  const btn = document.querySelector("[data-mobile-toggle]");
  const panel = document.querySelector("[data-mobile-panel]");
  if(!btn || !panel) return;
  btn.addEventListener("click", ()=>{
    panel.classList.toggle("open");
    btn.setAttribute("aria-expanded", panel.classList.contains("open") ? "true" : "false");
  });
  panel.querySelectorAll("a").forEach(a=>{
    a.addEventListener("click", ()=> panel.classList.remove("open"));
  });
}

function setupContactForm(){
  const form = document.querySelector("[data-web3form]");
  if(!form) return;

  const keyInput = form.querySelector('input[name="access_key"]');
  const status = document.querySelector("[data-form-status]");
  const btn = form.querySelector('button[type="submit"]');

  const accessKey = keyInput?.value?.trim();
  if(!accessKey || accessKey === "PASTE_YOUR_WEB3FORMS_ACCESS_KEY_HERE"){
    if(status){
      status.className = "notice bad";
      status.innerHTML = "<b>Action needed:</b> Add your Web3Forms access key in <span style='font-family:var(--mono)'>contact.html</span> to enable submissions.";
    }
  }

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    if(!status) return;

    status.className = "notice";
    status.textContent = "Sending…";
    if(btn){ btn.disabled = true; btn.style.opacity = ".8"; }

    const payload = new FormData(form);

    try{
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: payload
      });
      const data = await res.json();
      if(data.success){
        status.className = "notice ok";
        status.innerHTML = "<b>Message sent.</b> We’ll get back to you shortly.";
        form.reset();
      }else{
        status.className = "notice bad";
        status.innerHTML = "<b>Couldn’t send.</b> Please try again, or email us directly.";
      }
    }catch(err){
      status.className = "notice bad";
      status.innerHTML = "<b>Network error.</b> Please try again, or email us directly.";
    }finally{
      if(btn){ btn.disabled = false; btn.style.opacity = "1"; }
    }
  });
}

setActiveNav();
setupMobileMenu();
setupContactForm();

