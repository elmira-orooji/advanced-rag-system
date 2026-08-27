import { useEffect, useRef, useSyncExternalStore } from "react";
import toast, { useToaster, resolveValue } from "react-hot-toast";
import { CircleCheck, CircleAlert, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { confirmationStore } from "../services/confirmation";
import "../styles/notifications.css";

export default function AppToaster() {
  const { i18n } = useTranslation();
  const fa = i18n.language.startsWith("fa");
  const { toasts } = useToaster({ duration: Infinity, success: { duration: Infinity }, error: { duration: Infinity }, blank: { duration: Infinity } });
  const confirmation = useSyncExternalStore(confirmationStore.subscribe, confirmationStore.getSnapshot);
  const item = [...toasts].reverse().find((entry) => entry.visible);
  const dialog = useRef<HTMLDialogElement>(null);
  const action = useRef<HTMLButtonElement>(null);
  const active = Boolean(confirmation || item);

  useEffect(() => {
    const element = dialog.current;
    if (!element || !active) return;
    element.showModal();
    return () => { element.close(); };
  }, [active]);
  useEffect(() => { if (active) action.current?.focus(); }, [active, confirmation, item?.id]);

  const kind = confirmation ? "warning" : item?.className?.includes("nexora-toast--warning") ? "warning" : item?.type ?? "blank";
  const Icon = kind === "success" ? CircleCheck : kind === "error" ? CircleAlert : kind === "warning" ? TriangleAlert : kind === "loading" ? LoaderCircle : Info;
  const labels = fa
    ? { success: "موفق", error: "خطا", warning: "هشدار", loading: "در حال انجام", blank: "اطلاع", custom: "اطلاع" }
    : { success: "Success", error: "Error", warning: "Warning", loading: "In progress", blank: "Notice", custom: "Notice" };

  return <dialog ref={dialog} dir={fa ? "rtl" : "ltr"} className={`nexora-toast nexora-message-dialog nexora-toast--${kind}`}
    role="alertdialog" aria-labelledby="notification-title" aria-describedby="notification-message"
    onCancel={(event) => { event.preventDefault(); if (confirmation) confirmationStore.answer(false); }}>
    {active && <>
      <span className="nexora-toast__icon" aria-hidden="true"><Icon size={22} /></span>
      <div className="nexora-toast__content">
        <h2 id="notification-title">{confirmation ? (fa ? "آیا مطمئن هستید؟" : "Are you sure?") : labels[kind]}</h2>
        <div id="notification-message" dir="auto">{confirmation ? confirmation.message : item ? resolveValue(item.message, item) : null}</div>
      </div>
      <div className="nexora-message-actions">
        {confirmation ? <>
          <button ref={action} type="button" onClick={() => confirmationStore.answer(false)}>{fa ? "انصراف" : "Cancel"}</button>
          <button type="button" className="is-confirm" onClick={() => confirmationStore.answer(true)}>{fa ? "بله، تأیید می‌کنم" : "Yes, confirm"}</button>
        </> : <button ref={action} type="button" className="is-primary" onClick={() => { if (item) toast.dismiss(item.id); }}>OK</button>}
      </div>
    </>}
  </dialog>;
}
