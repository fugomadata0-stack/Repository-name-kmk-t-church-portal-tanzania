export function showToast(message, type = "success", ttl = 2600) {
  const wrap = document.getElementById("toastWrap");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  wrap.appendChild(toast);
  setTimeout(() => toast.remove(), ttl);
}

export function askConfirm({ title, message, onConfirm }) {
  const backdrop = document.getElementById("confirmBackdrop");
  const titleEl = document.getElementById("confirmTitle");
  const msgEl = document.getElementById("confirmMessage");
  const okBtn = document.getElementById("confirmOkBtn");
  const cancelBtn = document.getElementById("confirmCancelBtn");

  titleEl.textContent = title;
  msgEl.textContent = message;
  backdrop.classList.add("show");

  const cleanup = () => {
    backdrop.classList.remove("show");
    okBtn.removeEventListener("click", onOk);
    cancelBtn.removeEventListener("click", onCancel);
  };
  const onOk = () => {
    cleanup();
    onConfirm();
  };
  const onCancel = () => cleanup();
  okBtn.addEventListener("click", onOk);
  cancelBtn.addEventListener("click", onCancel);
}
