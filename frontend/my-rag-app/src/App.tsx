import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";


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
      <Routes>
        <Route
          path="/"
          element={<LoginPage />}
        />

        <Route
          path="/home"
          element={<ProtectedRoute><AppLayout /></ProtectedRoute>}
        />
      </Routes>
    </BrowserRouter>
  );
}
