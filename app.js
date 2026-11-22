const STORAGE_KEY = "password-studio-vault";

const charsets = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

const elements = {
  savedCount: document.querySelector("#savedCount"),
  lengthBadge: document.querySelector("#lengthBadge"),
  generatedPassword: document.querySelector("#generatedPassword"),
  passwordLength: document.querySelector("#passwordLength"),
  useUppercase: document.querySelector("#useUppercase"),
  useLowercase: document.querySelector("#useLowercase"),
  useNumbers: document.querySelector("#useNumbers"),
  useSymbols: document.querySelector("#useSymbols"),
  accountName: document.querySelector("#accountName"),
  accountMeta: document.querySelector("#accountMeta"),
  encryptionKey: document.querySelector("#encryptionKey"),
  generateBtn: document.querySelector("#generateBtn"),
  saveBtn: document.querySelector("#saveBtn"),
  clearAllBtn: document.querySelector("#clearAllBtn"),
  copyGeneratedBtn: document.querySelector("#copyGeneratedBtn"),
  unlockAllBtn: document.querySelector("#unlockAllBtn"),
  feedback: document.querySelector("#feedback"),
  strengthLabel: document.querySelector("#strengthLabel"),
  emptyState: document.querySelector("#emptyState"),
  passwordList: document.querySelector("#passwordList"),
  template: document.querySelector("#passwordItemTemplate"),
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let vault = loadVault();

function getOptions() {
  return {
    length: Number(elements.passwordLength.value),
    uppercase: elements.useUppercase.checked,
    lowercase: elements.useLowercase.checked,
    numbers: elements.useNumbers.checked,
    symbols: elements.useSymbols.checked,
  };
}

function generatePassword() {
  const options = getOptions();
  const selectedSets = Object.entries({
    uppercase: options.uppercase,
    lowercase: options.lowercase,
    numbers: options.numbers,
    symbols: options.symbols,
  })
    .filter(([, enabled]) => enabled)
    .map(([key]) => charsets[key]);

  if (!selectedSets.length) {
    showFeedback("Pilih minimal satu jenis karakter.", "error");
    return "";
  }

  const pool = selectedSets.join("");
  const passwordChars = selectedSets.map((set) => pickRandom(set));

  while (passwordChars.length < options.length) {
    passwordChars.push(pickRandom(pool));
  }

  elements.generatedPassword.value = shuffle(passwordChars).join("");
  updateStrength();
  return elements.generatedPassword.value;
}

function pickRandom(source) {
  return source[randomIndex(source.length)];
}

function shuffle(items) {
  const cloned = [...items];
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
  }
  return cloned;
}

function randomIndex(max) {
  if (globalThis.crypto?.getRandomValues) {
    const randomValues = new Uint32Array(1);
    globalThis.crypto.getRandomValues(randomValues);
    return randomValues[0] % max;
  }

  return Math.floor(Math.random() * max);
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function savePassword() {
  const password = elements.generatedPassword.value || generatePassword();
  const name = elements.accountName.value.trim();
  const meta = elements.accountMeta.value.trim();
  const key = elements.encryptionKey.value;

  if (!name || !meta || !key) {
    showFeedback("Isi nama akun, website/username, dan kunci enkripsi dulu.", "error");
    return;
  }

  const encryptedPassword = await encryptText(password, key);
  vault.unshift({
    id: createId(),
    name,
    meta,
    encryptedPassword,
    createdAt: new Date().toISOString(),
  });

  persistVault();
  elements.accountName.value = "";
  elements.accountMeta.value = "";
  renderVault();
  showFeedback("Password berhasil disimpan ke vault lokal.", "success");
}

async function encryptText(text, key) {
  if (globalThis.crypto?.subtle) {
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await deriveKey(key, salt);
    const encrypted = await globalThis.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      encoder.encode(text)
    );

    return {
      method: "AES-GCM",
      salt: toBase64(salt),
      iv: toBase64(iv),
      value: toBase64(new Uint8Array(encrypted)),
    };
  }

  return {
    method: "simple-xor",
    value: btoa(xorText(text, key)),
  };
}

async function decryptText(payload, key) {
  if (payload.method === "AES-GCM" && globalThis.crypto?.subtle) {
    const salt = fromBase64(payload.salt);
    const iv = fromBase64(payload.iv);
    const encrypted = fromBase64(payload.value);
    const cryptoKey = await deriveKey(key, salt);
    const decrypted = await globalThis.crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, encrypted);
    return decoder.decode(decrypted);
  }

  if (payload.method === "simple-xor") {
    return xorText(atob(payload.value), key);
  }

  throw new Error("Format enkripsi tidak dikenali.");
}

async function deriveKey(password, salt) {
  const baseKey = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return globalThis.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 120000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function xorText(text, key) {
  return [...text]
    .map((character, index) =>
      String.fromCharCode(character.charCodeAt(0) ^ key.charCodeAt(index % key.length))
    )
    .join("");
}

function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function loadVault() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function persistVault() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
}

function renderVault() {
  elements.savedCount.textContent = String(vault.length);
  elements.emptyState.classList.toggle("hidden", vault.length > 0);
  elements.passwordList.innerHTML = "";

  vault.forEach((item) => {
    const fragment = elements.template.content.cloneNode(true);
    const node = fragment.querySelector(".password-item");
    const title = fragment.querySelector(".item-title");
    const meta = fragment.querySelector(".item-meta");
    const input = fragment.querySelector(".item-password");
    const revealBtn = fragment.querySelector(".reveal-btn");
    const copyBtn = fragment.querySelector(".copy-btn");
    const deleteBtn = fragment.querySelector(".delete-btn");

    title.textContent = item.name;
    meta.textContent = `${item.meta} • ${formatDate(item.createdAt)}`;
    input.value = "Password terkunci";

    revealBtn.addEventListener("click", async () => {
      const revealed = await revealPassword(item, input);
      if (!revealed) return;
      input.type = input.type === "password" ? "text" : "password";
      revealBtn.textContent = input.type === "password" ? "Buka" : "Tutup";
    });

    copyBtn.addEventListener("click", async () => {
      const decrypted = await getDecryptedPassword(item);
      if (!decrypted) return;
      await copyText(decrypted);
      showFeedback("Password tersalin.", "success");
    });

    deleteBtn.addEventListener("click", () => {
      if (!confirm(`Hapus password untuk ${item.name}?`)) return;
      vault = vault.filter((entry) => entry.id !== item.id);
      persistVault();
      renderVault();
      showFeedback("Password dihapus.", "success");
    });

    node.dataset.id = item.id;
    elements.passwordList.appendChild(fragment);
  });
}

async function revealPassword(item, input) {
  const decrypted = await getDecryptedPassword(item);
  if (!decrypted) return false;
  input.value = decrypted;
  return true;
}

async function getDecryptedPassword(item) {
  const key = elements.encryptionKey.value;
  if (!key) {
    showFeedback("Isi kunci enkripsi untuk membuka password.", "error");
    return "";
  }

  try {
    return await decryptText(item.encryptedPassword, key);
  } catch {
    showFeedback("Kunci enkripsi salah atau data tidak bisa dibuka.", "error");
    return "";
  }
}

async function unlockAll() {
  const inputs = [...document.querySelectorAll(".password-item")];
  if (!inputs.length) return;

  for (const node of inputs) {
    const item = vault.find((entry) => entry.id === node.dataset.id);
    const input = node.querySelector(".item-password");
    const decrypted = await getDecryptedPassword(item);
    if (!decrypted) return;
    input.value = decrypted;
    input.type = "text";
    node.querySelector(".reveal-btn").textContent = "Tutup";
  }

  showFeedback("Daftar password berhasil dibuka.", "success");
}

function updateStrength() {
  const options = getOptions();
  const variety = [options.uppercase, options.lowercase, options.numbers, options.symbols].filter(Boolean).length;
  const score = options.length + variety * 4;

  if (score >= 28) {
    elements.strengthLabel.textContent = "Sangat kuat";
    return;
  }

  if (score >= 20) {
    elements.strengthLabel.textContent = "Kuat";
    return;
  }

  elements.strengthLabel.textContent = "Sedang";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function showFeedback(message, type = "success") {
  elements.feedback.textContent = message;
  elements.feedback.style.color = type === "error" ? "var(--danger)" : "var(--accent-dark)";
  window.clearTimeout(showFeedback.timeout);
  showFeedback.timeout = window.setTimeout(() => {
    elements.feedback.textContent = "";
  }, 3600);
}

async function copyGeneratedPassword() {
  if (!elements.generatedPassword.value) generatePassword();
  await copyText(elements.generatedPassword.value);
  showFeedback("Password generator tersalin.", "success");
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function clearAll() {
  if (!vault.length) return;
  if (!confirm("Hapus semua password tersimpan di browser ini?")) return;
  vault = [];
  persistVault();
  renderVault();
  showFeedback("Semua password sudah dihapus.", "success");
}

elements.generateBtn.addEventListener("click", generatePassword);
elements.saveBtn.addEventListener("click", savePassword);
elements.clearAllBtn.addEventListener("click", clearAll);
elements.copyGeneratedBtn.addEventListener("click", copyGeneratedPassword);
elements.unlockAllBtn.addEventListener("click", unlockAll);
elements.passwordLength.addEventListener("input", () => {
  elements.lengthBadge.textContent = elements.passwordLength.value;
  updateStrength();
});

[
  elements.useUppercase,
  elements.useLowercase,
  elements.useNumbers,
  elements.useSymbols,
].forEach((checkbox) => checkbox.addEventListener("change", updateStrength));

generatePassword();
renderVault();
