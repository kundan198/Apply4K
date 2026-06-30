import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Resume from "./pages/Resume";
import Jobs from "./pages/Jobs";
import Tailor from "./pages/Tailor";
import Messages from "./pages/Messages";
import Tracker from "./pages/Tracker";
import Legitimacy from "./pages/Legitimacy";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/tailor" element={<Tailor />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/tracker" element={<Tracker />} />
        <Route path="/legitimacy" element={<Legitimacy />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}
