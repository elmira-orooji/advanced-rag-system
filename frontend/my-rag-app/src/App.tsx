import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AppLayout from "./layouts/AppLayout";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<LoginPage />}
        />

        <Route
          path="/home"
          element={
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}