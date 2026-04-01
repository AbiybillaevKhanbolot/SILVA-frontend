import { Navigate, Route, Routes } from "react-router-dom";
import { legacyRoutes } from "./config/routes";
import LegacyFramePage from "./pages/LegacyFramePage";

function App() {
  return (
    <Routes>
      {legacyRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={<LegacyFramePage file={route.file} />}
        />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
