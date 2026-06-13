import Login from './pages/login'
import Register from './pages/register'
import Dashboard from './pages/Dashboard'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './routes/protectedRoute'
import Timer from './pages/timer'
import Navbar from './components/navbar'

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/timer" element={
          <ProtectedRoute>
            <Timer />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  )
}

export default App