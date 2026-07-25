(function () {
  const STORAGE_KEY = "protocord_phonebook_v1";
  const TRANSCRIBER_STORAGE_KEY = "protocord_ia_transcriber_v1";

  const state = {
    contacts: [],
    searchTerm: "",
    editingId: null,
  };

  const els = {};
  let started = false;

  function normalizePhone(phone) {
    const digits = String(phone || "").replace(/\D+/g, "");
    return digits.length >= 8 ? digits : "";
  }

  function normalizeName(name) {
    return String(name || "").trim().replace(/\s+/g, " ");
  }

  function createId() {
    return `contact-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function readContacts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return Array.isArray(parsed.contacts)
        ? parsed.contacts
            .map((contact) => ({
              id: contact.id || createId(),
              name: normalizeName(contact.name),
              phone: String(contact.phone || ""),
              phoneKey: normalizePhone(contact.phoneKey || contact.phone),
              createdAt: contact.createdAt || new Date().toISOString(),
              updatedAt: contact.updatedAt || contact.createdAt || new Date().toISOString(),
              source: contact.source || "",
            }))
            .filter((contact) => contact.name && contact.phoneKey)
        : [];
    } catch (_error) {
      return [];
    }
  }

  function mergeTranscriberContacts(contacts) {
    let changed = false;
    const merged = [...contacts];

    try {
      const parsed = JSON.parse(localStorage.getItem(TRANSCRIBER_STORAGE_KEY) || "{}");
      const tickets = Array.isArray(parsed.tickets) ? parsed.tickets : [];

      tickets.forEach((ticket) => {
        const name = normalizeName(ticket.customName);
        const phone = String(ticket.phone || "").trim();
        const phoneKey = normalizePhone(phone);
        if (!isNameUsefulForPhone(name, phone)) return;
        if (merged.some((contact) => contact.phoneKey === phoneKey)) return;

        const now = new Date().toISOString();
        merged.push({
          id: createId(),
          name,
          phone,
          phoneKey,
          createdAt: ticket.createdAt || now,
          updatedAt: now,
          source: "transcricao",
        });
        changed = true;
      });
    } catch (_error) {
      return { contacts, changed: false };
    }

    return { contacts: merged, changed };
  }

  function persistContacts() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        contacts: state.contacts,
      })
    );
  }

  function sortContacts(contacts) {
    return [...contacts].sort((a, b) => {
      const byName = a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
      if (byName !== 0) return byName;
      return a.phone.localeCompare(b.phone, "pt-BR");
    });
  }

  function emitUpdate(contact, previousContact) {
    window.dispatchEvent(
      new CustomEvent("protocord:phonebook-updated", {
        detail: {
          contact: contact || null,
          previousContact: previousContact || null,
          contacts: getContacts(),
        },
      })
    );
  }

  function getContacts() {
    return sortContacts(state.contacts).map((contact) => ({ ...contact }));
  }

  function findByPhone(phone) {
    const phoneKey = normalizePhone(phone);
    if (!phoneKey) return null;
    const match = state.contacts.find((contact) => contact.phoneKey === phoneKey);
    return match ? { ...match } : null;
  }

  function isNameUsefulForPhone(name, phone) {
    const cleanName = normalizeName(name);
    const phoneKey = normalizePhone(phone);
    if (!cleanName || !phoneKey) return false;
    if (/^novo ticket$/i.test(cleanName)) return false;
    return normalizePhone(cleanName) !== phoneKey;
  }

  function upsertContact(input) {
    const name = normalizeName(input?.name);
    const phone = String(input?.phone || "").trim();
    const phoneKey = normalizePhone(phone);

    if (!isNameUsefulForPhone(name, phone)) return null;

    const now = new Date().toISOString();
    const indexById = input?.id ? state.contacts.findIndex((contact) => contact.id === input.id) : -1;
    const indexByPhone = state.contacts.findIndex((contact) => contact.phoneKey === phoneKey);
    const index = indexById >= 0 ? indexById : indexByPhone;
    let previousContact = null;
    let contact;

    if (index >= 0) {
      previousContact = { ...state.contacts[index] };
      contact = {
        ...state.contacts[index],
        name,
        phone,
        phoneKey,
        updatedAt: now,
        source: input?.source || state.contacts[index].source || "",
      };
      state.contacts[index] = contact;
      state.contacts = state.contacts.filter((entry, entryIndex) => {
        return entryIndex === index || entry.phoneKey !== phoneKey;
      });
    } else {
      contact = {
        id: createId(),
        name,
        phone,
        phoneKey,
        createdAt: now,
        updatedAt: now,
        source: input?.source || "",
      };
      state.contacts.unshift(contact);
    }

    persistContacts();
    emitUpdate(contact, previousContact);
    render();
    return { ...contact };
  }

  function removeContact(contactId) {
    const contact = state.contacts.find((entry) => entry.id === contactId);
    if (!contact) return;
    state.contacts = state.contacts.filter((entry) => entry.id !== contactId);
    persistContacts();
    emitUpdate(null, contact);
    render();
    notify("Contato removido.", "success");
  }

  function exportContacts() {
    const rows = [["Nome", "Telefone", "Atualizado em"]].concat(
      getContacts().map((contact) => [
        contact.name,
        contact.phone,
        formatDateTime(contact.updatedAt),
      ])
    );
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agenda-telefonica-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function injectStyles() {
    if (document.getElementById("protocord-phonebook-style")) return;

    const style = document.createElement("style");
    style.id = "protocord-phonebook-style";
    style.textContent = `
      #pagina-agenda,
      #pagina-agenda * {
        box-sizing: border-box;
      }

      #pagina-agenda {
        --agenda-bg: #07111f;
        --agenda-panel: rgba(7, 17, 33, .78);
        --agenda-panel-strong: rgba(5, 12, 26, .9);
        --agenda-border: rgba(44, 78, 128, .34);
        --agenda-border-strong: rgba(63, 104, 166, .46);
        --agenda-text: #e8eefc;
        --agenda-title: #ffffff;
        --agenda-soft: #9fb1d1;
        --agenda-faint: #6f84aa;
        --agenda-accent: #28c6e5;
        --agenda-success: #4ade80;
        --agenda-danger: #f87171;
        color: var(--agenda-text);
      }

      html[data-theme="light"] #pagina-agenda,
      body[data-theme="light"] #pagina-agenda,
      html.light #pagina-agenda,
      body.light #pagina-agenda,
      .theme-light #pagina-agenda,
      [data-bs-theme="light"] #pagina-agenda {
        --agenda-bg: #eef4fb;
        --agenda-panel: rgba(255, 255, 255, .84);
        --agenda-panel-strong: rgba(255, 255, 255, .94);
        --agenda-border: rgba(144, 170, 206, .34);
        --agenda-border-strong: rgba(120, 155, 204, .44);
        --agenda-text: #20314f;
        --agenda-title: #12213c;
        --agenda-soft: #5d7398;
        --agenda-faint: #7f94b4;
        --agenda-accent: #0891b2;
        --agenda-success: #16a34a;
        --agenda-danger: #dc2626;
      }

      .phonebook-shell {
        display: grid;
        gap: 24px;
      }

      .phonebook-hero,
      .phonebook-panel {
        border: 1px solid var(--agenda-border);
        background:
          radial-gradient(circle at top right, rgba(40, 198, 229, .10), transparent 28%),
          linear-gradient(180deg, var(--agenda-panel), rgba(255,255,255,.01));
        box-shadow: 0 20px 60px rgba(0, 0, 0, .18);
        backdrop-filter: blur(16px);
      }

      .phonebook-hero {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        padding: 28px 32px;
        border-radius: 28px;
      }

      .phonebook-eyebrow {
        margin: 0 0 10px;
        color: var(--agenda-accent);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .18em;
        text-transform: uppercase;
      }

      .phonebook-title {
        margin: 0;
        color: var(--agenda-title);
        font-size: clamp(30px, 3vw, 44px);
        line-height: 1.02;
        font-weight: 900;
      }

      .phonebook-subtitle {
        margin: 12px 0 0;
        color: var(--agenda-soft);
        font-size: 15px;
        line-height: 1.55;
      }

      .phonebook-stats {
        display: grid;
        grid-template-columns: repeat(2, minmax(130px, 1fr));
        gap: 12px;
        min-width: 300px;
      }

      .phonebook-stat {
        border: 1px solid var(--agenda-border);
        border-radius: 20px;
        background: var(--agenda-panel-strong);
        padding: 18px;
      }

      .phonebook-stat span {
        display: block;
        color: var(--agenda-faint);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .14em;
        text-transform: uppercase;
      }

      .phonebook-stat strong {
        display: block;
        margin-top: 10px;
        color: var(--agenda-title);
        font-size: 28px;
        line-height: 1;
      }

      .phonebook-grid {
        display: grid;
        grid-template-columns: minmax(280px, .72fr) minmax(420px, 1.28fr);
        gap: 22px;
        align-items: start;
      }

      .phonebook-panel {
        border-radius: 26px;
        overflow: hidden;
      }

      .phonebook-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 18px 22px;
        border-bottom: 1px solid var(--agenda-border);
      }

      .phonebook-panel-title {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }

      .phonebook-panel-title h3 {
        margin: 0;
        color: var(--agenda-title);
        font-size: 13px;
        font-weight: 900;
        letter-spacing: .13em;
        text-transform: uppercase;
      }

      .phonebook-body {
        padding: 22px;
      }

      .phonebook-form {
        display: grid;
        gap: 14px;
      }

      .phonebook-field {
        display: grid;
        gap: 8px;
      }

      .phonebook-field span {
        color: var(--agenda-faint);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .14em;
        text-transform: uppercase;
      }

      .phonebook-input {
        width: 100%;
        border-radius: 15px;
        border: 1px solid var(--agenda-border);
        background: var(--agenda-panel-strong);
        color: var(--agenda-text);
        outline: none;
        padding: 13px 14px;
        font-size: 14px;
        transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
      }

      .phonebook-input:focus {
        border-color: rgba(40,198,229,.62);
        box-shadow: 0 0 0 4px rgba(40,198,229,.10);
      }

      .phonebook-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 4px;
      }

      .phonebook-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 42px;
        border: 1px solid var(--agenda-border);
        border-radius: 14px;
        background: var(--agenda-panel-strong);
        color: var(--agenda-text);
        padding: 0 14px;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        transition: transform .18s ease, border-color .18s ease, background .18s ease;
      }

      .phonebook-btn:hover {
        transform: translateY(-1px);
        border-color: var(--agenda-border-strong);
      }

      .phonebook-btn-primary {
        border-color: rgba(40,198,229,.24);
        background: linear-gradient(135deg, #16b7d8, #35cae7);
        color: #072f42;
      }

      .phonebook-list-tools {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
      }

      .phonebook-list-tools .phonebook-input {
        min-width: min(320px, 100%);
      }

      .phonebook-list {
        display: grid;
        gap: 10px;
      }

      .phonebook-row {
        display: grid;
        grid-template-columns: minmax(0, 1.1fr) minmax(150px, .75fr) auto;
        gap: 14px;
        align-items: center;
        border: 1px solid var(--agenda-border);
        border-radius: 18px;
        background: var(--agenda-panel-strong);
        padding: 14px 16px;
      }

      .phonebook-name {
        min-width: 0;
      }

      .phonebook-name strong,
      .phonebook-phone strong {
        display: block;
        color: var(--agenda-title);
        font-size: 15px;
        line-height: 1.3;
        word-break: break-word;
      }

      .phonebook-name span,
      .phonebook-phone span {
        display: block;
        margin-top: 4px;
        color: var(--agenda-faint);
        font-size: 11px;
        font-weight: 700;
      }

      .phonebook-row-actions {
        display: flex;
        gap: 8px;
      }

      .phonebook-icon-btn {
        width: 38px;
        height: 38px;
        border-radius: 13px;
        border: 1px solid var(--agenda-border);
        background: rgba(255,255,255,.02);
        color: var(--agenda-text);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .phonebook-icon-btn:hover {
        border-color: var(--agenda-border-strong);
      }

      .phonebook-icon-danger {
        color: var(--agenda-danger);
      }

      .phonebook-empty {
        border: 1px dashed var(--agenda-border-strong);
        border-radius: 20px;
        padding: 28px;
        text-align: center;
        color: var(--agenda-soft);
      }

      @media (max-width: 1024px) {
        .phonebook-hero,
        .phonebook-grid {
          grid-template-columns: 1fr;
        }

        .phonebook-hero {
          flex-direction: column;
        }

        .phonebook-stats {
          min-width: 0;
        }
      }

      @media (max-width: 720px) {
        .phonebook-row {
          grid-template-columns: 1fr;
        }

        .phonebook-row-actions {
          justify-content: flex-start;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureLayout() {
    const page = document.getElementById("pagina-agenda");
    if (!page || page.dataset.phonebookLayout === "true") return;

    page.dataset.phonebookLayout = "true";
    page.innerHTML = `
      <section class="phonebook-shell">
        <section class="phonebook-hero">
          <div>
            <p class="phonebook-eyebrow">Agenda</p>
            <h2 class="phonebook-title">Agenda telefonica</h2>
            <p class="phonebook-subtitle">Contatos usados nos atendimentos e nas transcricoes.</p>
          </div>
          <div class="phonebook-stats">
            <article class="phonebook-stat">
              <span>Contatos</span>
              <strong id="phonebook-total">0</strong>
            </article>
            <article class="phonebook-stat">
              <span>Atualizados</span>
              <strong id="phonebook-updated-today">0</strong>
            </article>
          </div>
        </section>

        <section class="phonebook-grid">
          <article class="phonebook-panel">
            <header class="phonebook-panel-header">
              <div class="phonebook-panel-title">
                <i data-lucide="user-plus" class="w-4 h-4"></i>
                <h3 id="phonebook-form-title">Novo contato</h3>
              </div>
            </header>
            <div class="phonebook-body">
              <form id="phonebook-form" class="phonebook-form">
                <label class="phonebook-field">
                  <span>Nome</span>
                  <input id="phonebook-name" class="phonebook-input" type="text" autocomplete="off" />
                </label>
                <label class="phonebook-field">
                  <span>Telefone</span>
                  <input id="phonebook-phone" class="phonebook-input" type="tel" autocomplete="off" />
                </label>
                <div class="phonebook-actions">
                  <button class="phonebook-btn phonebook-btn-primary" type="submit">
                    <i data-lucide="save" class="w-4 h-4"></i>
                    <span>Salvar</span>
                  </button>
                  <button id="phonebook-cancel" class="phonebook-btn hidden" type="button">
                    <i data-lucide="x" class="w-4 h-4"></i>
                    <span>Cancelar</span>
                  </button>
                </div>
              </form>
            </div>
          </article>

          <article class="phonebook-panel">
            <header class="phonebook-panel-header">
              <div class="phonebook-panel-title">
                <i data-lucide="contact-round" class="w-4 h-4"></i>
                <h3>Contatos salvos</h3>
              </div>
              <div class="phonebook-list-tools">
                <input id="phonebook-search" class="phonebook-input" type="search" placeholder="Buscar contato..." />
                <button id="phonebook-export" class="phonebook-btn" type="button" title="Exportar CSV">
                  <i data-lucide="download" class="w-4 h-4"></i>
                </button>
              </div>
            </header>
            <div class="phonebook-body">
              <div id="phonebook-list" class="phonebook-list"></div>
            </div>
          </article>
        </section>
      </section>
    `;
  }

  function bindElements() {
    els.page = document.getElementById("pagina-agenda");
    els.form = document.getElementById("phonebook-form");
    els.formTitle = document.getElementById("phonebook-form-title");
    els.nameInput = document.getElementById("phonebook-name");
    els.phoneInput = document.getElementById("phonebook-phone");
    els.cancelBtn = document.getElementById("phonebook-cancel");
    els.searchInput = document.getElementById("phonebook-search");
    els.exportBtn = document.getElementById("phonebook-export");
    els.list = document.getElementById("phonebook-list");
    els.total = document.getElementById("phonebook-total");
    els.updatedToday = document.getElementById("phonebook-updated-today");
  }

  function bindEvents() {
    els.form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const contact = upsertContact({
        id: state.editingId,
        name: els.nameInput?.value,
        phone: els.phoneInput?.value,
        source: "agenda",
      });

      if (!contact) {
        notify("Informe nome e telefone validos.", "warning");
        return;
      }

      clearForm();
      notify("Contato salvo.", "success");
    });

    els.cancelBtn?.addEventListener("click", clearForm);

    els.searchInput?.addEventListener("input", (event) => {
      state.searchTerm = event.target.value || "";
      renderList();
    });

    els.exportBtn?.addEventListener("click", () => {
      if (!state.contacts.length) {
        notify("Agenda vazia.", "warning");
        return;
      }
      exportContacts();
    });

    els.list?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-phonebook-action]");
      if (!button) return;
      const contact = state.contacts.find((entry) => entry.id === button.dataset.contactId);
      if (!contact) return;

      if (button.dataset.phonebookAction === "edit") {
        beginEdit(contact);
      }

      if (button.dataset.phonebookAction === "delete") {
        removeContact(contact.id);
      }
    });
  }

  function beginEdit(contact) {
    state.editingId = contact.id;
    if (els.nameInput) els.nameInput.value = contact.name;
    if (els.phoneInput) els.phoneInput.value = contact.phone;
    if (els.formTitle) els.formTitle.textContent = "Editar contato";
    els.cancelBtn?.classList.remove("hidden");
    els.nameInput?.focus();
  }

  function clearForm() {
    state.editingId = null;
    if (els.nameInput) els.nameInput.value = "";
    if (els.phoneInput) els.phoneInput.value = "";
    if (els.formTitle) els.formTitle.textContent = "Novo contato";
    els.cancelBtn?.classList.add("hidden");
  }

  function render() {
    renderStats();
    renderList();
    window.requestLucideIcons?.();
  }

  function renderStats() {
    if (els.total) els.total.textContent = String(state.contacts.length);
    if (els.updatedToday) {
      const today = new Date().toISOString().slice(0, 10);
      const count = state.contacts.filter((contact) => String(contact.updatedAt || "").startsWith(today)).length;
      els.updatedToday.textContent = String(count);
    }
  }

  function renderList() {
    if (!els.list) return;

    const term = state.searchTerm.trim().toLowerCase();
    const contacts = getContacts().filter((contact) => {
      const composite = `${contact.name} ${contact.phone}`.toLowerCase();
      return !term || composite.includes(term);
    });

    if (!contacts.length) {
      els.list.innerHTML = `<div class="phonebook-empty">Nenhum contato encontrado.</div>`;
      return;
    }

    els.list.innerHTML = contacts
      .map((contact) => {
        return `
          <article class="phonebook-row">
            <div class="phonebook-name">
              <strong>${escapeHtml(contact.name)}</strong>
              <span>${escapeHtml(formatDateTime(contact.updatedAt))}</span>
            </div>
            <div class="phonebook-phone">
              <strong>${escapeHtml(formatPhone(contact.phone))}</strong>
              <span>Telefone</span>
            </div>
            <div class="phonebook-row-actions">
              <button class="phonebook-icon-btn" type="button" data-phonebook-action="edit" data-contact-id="${contact.id}" title="Editar">
                <i data-lucide="square-pen" class="w-4 h-4"></i>
              </button>
              <button class="phonebook-icon-btn phonebook-icon-danger" type="button" data-phonebook-action="delete" data-contact-id="${contact.id}" title="Excluir">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function formatPhone(phone) {
    const digits = normalizePhone(phone);
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 13 && digits.startsWith("55")) {
      return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    return phone || digits || "--";
  }

  function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function notify(message, type) {
    if (typeof window.showToast === "function") {
      window.showToast(message, type);
      return;
    }
    console.log(`[${type || "info"}] ${message}`);
  }

  function initPhonebookPage() {
    injectStyles();
    ensureLayout();
    bindElements();
    if (!els.page) return;
    if (!started) {
      bindEvents();
      started = true;
    }
    render();
  }

  {
    const migrated = mergeTranscriberContacts(readContacts());
    state.contacts = migrated.contacts;
    if (migrated.changed) {
      persistContacts();
    }
  }

  window.ProtoCordPhonebook = {
    getContacts,
    findByPhone,
    upsertContact,
    normalizePhone,
    isNameUsefulForPhone,
  };

  window.initPhonebookPage = initPhonebookPage;

  document.addEventListener("DOMContentLoaded", () => {
    const page = document.getElementById("pagina-agenda");
    if (page && !page.classList.contains("hidden")) {
      window.initPhonebookPage?.();
    }
  });
})();
