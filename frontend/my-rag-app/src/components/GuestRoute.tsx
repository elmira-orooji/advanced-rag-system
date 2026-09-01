import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { authService } from "../services/authService";

export default function GuestRoute({ children }: { children: ReactNode }) {
  if (authService.isAuthenticated()) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
