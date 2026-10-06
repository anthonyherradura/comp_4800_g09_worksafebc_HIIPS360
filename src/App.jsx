import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import Layout from "./components/Layout";
import PublicLayout from "./components/PublicLayout";
import RequireAuth from "./components/RequireAuth";
import LandingPage from "./pages/Landing/Landing";
import LoginPage from "./pages/Login/Login";
import RegisterPage from "./pages/Register/Register";
import HomePage from "./pages/Homepage/Homepage";
import PlanningPage from "./pages/Planning/Planning";

 
const Placeholder = ({ name }) => (
  <div style={{ padding: 24, fontSize: 20 }}>{name} page</div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Pages before sign-in: header only, no nav bar */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Every route inside here needs a signed-in user and gets the header + nav bar */}
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/home" element={<HomePage />} />
            <Route path="/dashboard" element={<Placeholder name="Dashboard" />} />
            <Route path="/planning" element={<PlanningPage />} />
            <Route path="/hazard" element={<Placeholder name="Hazard" />} />
            <Route path="/summary" element={<Placeholder name="Summary" />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
