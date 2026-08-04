import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { authService } from "../services/authService";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  if (!authService.isAuthenticated()) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  return children;
}
