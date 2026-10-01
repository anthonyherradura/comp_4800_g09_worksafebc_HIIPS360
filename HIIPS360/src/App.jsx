import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/Homepage/Homepage";


const Placeholder = ({ name }) => (
  <div style={{ padding: 24, fontSize: 20 }}>{name} page</div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Every route inside here gets the header + nav bar automatically */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<Placeholder name="Dashboard" />} />
          <Route path="/planning" element={<Placeholder name="Planning" />} />
          <Route path="/hazard" element={<Placeholder name="Hazard" />} />
          <Route path="/summary" element={<Placeholder name="Summary" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}