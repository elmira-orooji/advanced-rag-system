import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import SharedChatPage from "./pages/SharedChatPage";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AUTH_EXPIRED_EVENT } from "./services/apiClient";

function SessionExpiryHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    const handleExpiry = () => {
      if (location.pathname === "/") return;
      toast.error(
        i18n.language.startsWith("fa")
          ? "نشست شما منقضی شده است. دوباره وارد شوید."
          : "Your session has expired. Please sign in again.",
        { id: "session-expired" },
      );
      navigate("/", { replace: true, state: { reason: "session-expired" } });
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpiry);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpiry);
  }, [i18n.language, location.pathname, navigate]);

  return null;
}


export default function App() {
  
    const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.dir =
      i18n.language === "fa"
        ? "rtl"
        : "ltr";
  }, [i18n.language]);

  return (
    <BrowserRouter>
      <SessionExpiryHandler />
      <Routes>
        <Route
          path="/"
          element={<LoginPage />}
        />

        <Route
          path="/home/*"
          element={<ProtectedRoute><AppLayout /></ProtectedRoute>}
        />
        <Route path="/share/:visibility/:token" element={<SharedChatPage />} />
      </Routes>
    </BrowserRouter>
  );
}
