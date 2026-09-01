import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { authService } from "../services/authService";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  if (!authService.isAuthenticated()) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/" replace state={{ from }} />;
  }
  return children;
}
