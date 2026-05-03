import { Routes, Route } from "react-router-dom";
import EditorPage from "./pages/EditorPage";
import HomePage from "./HomePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/room/:roomId" element={<EditorPage />} />
    </Routes>
  );
}

export default App;