import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import Layout from "./components/Layout";
import PublicLayout from "./components/PublicLayout";
import RequireAuth from "./components/RequireAuth";
import LandingPage from "./pages/Landing/Landing";
import LoginPage from "./pages/Login/Login";
import RegisterPage from "./pages/Register/Register";
import HomePage from "./pages/Homepage/Homepage";
import JobsPage from "./pages/Jobs/Jobs";
import PlanningPage from "./pages/Planning/Planning";
import { HazardProvider } from "./context/HazardContext";
import { JobProvider } from "./context/JobContext";
import HazardList from "./pages/Hazard/HazardList";
import HazardAdd from "./pages/Hazard/HazardAdd";
import HazardDetail from "./pages/Hazard/HazardDetail";
import SummaryPage from "./pages/Summary/Summary";

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

          {/* Signed-in pages: header + nav bar, and job/hazard data shared across them */}
          <Route
            element={
              <RequireAuth>
                <JobProvider>
                  <HazardProvider>
                    <Layout />
                  </HazardProvider>
                </JobProvider>
              </RequireAuth>
            }
          >
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/dashboard" element={<Placeholder name="Dashboard" />} />
            <Route path="/planning" element={<PlanningPage />} />
            <Route path="/hazard" element={<HazardList />} />
            <Route path="/hazard/new" element={<HazardAdd />} />
            <Route path="/hazard/:id" element={<HazardDetail />} />
            <Route path="/summary" element={<SummaryPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}