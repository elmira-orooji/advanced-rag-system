import toast, { Toaster, resolveValue } from "react-hot-toast";
import { CircleCheck, CircleAlert, Info, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import "../styles/notifications.css";

export default function AppToaster() {
  const { i18n } = useTranslation();
  const fa = i18n.language.startsWith("fa");
  const labels = fa
    ? { success: "موفق", error: "خطا", warning: "هشدار", loading: "در حال انجام", blank: "اطلاع" }
    : { success: "Success", error: "Error", warning: "Warning", loading: "In progress", blank: "Notice" };

  return <Toaster position={fa ? "top-left" : "top-right"} gutter={10}
    containerClassName="nexora-notifications"
    containerStyle={{ top: 20, left: 16, right: 16, zIndex: 10000 }}
    toastOptions={{ duration: 4500, success: { duration: 3500 }, error: { duration: 6500 } }}>
    {(item) => {
      if (item.type === "custom") return <>{resolveValue(item.message, item)}</>;
      const kind = item.className?.includes("nexora-toast--warning") ? "warning" : item.type;
      const Icon = kind === "success" ? CircleCheck : kind === "error" ? CircleAlert : kind === "warning" ? TriangleAlert : kind === "loading" ? LoaderCircle : Info;
      return <div dir={fa ? "rtl" : "ltr"} className={`nexora-toast nexora-toast--${kind} ${item.visible ? "is-visible" : "is-leaving"}`}>
        <span className="nexora-toast__icon" aria-hidden="true">{item.icon || <Icon size={18} />}</span>
        <div className="nexora-toast__content" {...item.ariaProps} aria-atomic="true">
          <strong>{labels[kind]}</strong>
          <div dir="auto">{resolveValue(item.message, item)}</div>
        </div>
        <button type="button" className="nexora-toast__close" aria-label={fa ? "بستن پیام" : "Dismiss notification"}
          onClick={() => toast.dismiss(item.id)}><X size={15} /></button>
      </div>;
    }}
  </Toaster>;
}
