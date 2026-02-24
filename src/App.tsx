import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthGuard } from './components/auth/AuthGuard';
import { RoleBasedRedirect } from './components/auth/RoleBasedRedirect';
import { Login } from './screens/Login';
import { SignUp } from './screens/Register';
import { Home } from './screens/Home';
import Equipment from './screens/Equipment';
import Users from './screens/ManageUsers';
import { BorrowEquipment } from './screens/BorrowEquipment';
import PendingRegistrations from './screens/PendingRegistrations';
import BorrowRequests from './screens/BorrowRequests';
import History from './screens/History';
import { ReturnEquipment } from './screens/ReturnEquipment';
import MyRequests from './screens/MyRequests/MyRequests';
import { MostBorrowedEquipment } from './screens/MostBorrowedEquipment';
import { MostDamagedEquipment } from './screens/MostDamagedEquipment';

function App() {
  return (
    <div style={{ backgroundColor: '#e8f7ff', minHeight: '100vh' }}>
      <AuthProvider>
        <LoadingProvider>
          <Router>
            <Routes>
              <Route path="/" element={<RoleBasedRedirect />} />
              <Route
                path="/login"
                element={
                  <AuthGuard>
                    <Login />
                  </AuthGuard>
                }
              />
              <Route
                path="/signup"
                element={
                  <AuthGuard>
                    <SignUp />
                  </AuthGuard>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/equipment"
                element={
                  <ProtectedRoute>
                    <Equipment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/borrow"
                element={
                  <ProtectedRoute>
                    <BorrowEquipment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-requests"
                element={
                  <ProtectedRoute>
                    <MyRequests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/borrow-requests"
                element={
                  <ProtectedRoute>
                    <BorrowRequests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pending-registrations"
                element={
                  <ProtectedRoute>
                    <PendingRegistrations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <History />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/return-equipment"
                element={
                  <ProtectedRoute>
                    <ReturnEquipment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/most-borrowed-equipment"
                element={
                  <ProtectedRoute>
                    <MostBorrowedEquipment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/most-damaged-equipment"
                element={
                  <ProtectedRoute>
                    <MostDamagedEquipment />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </LoadingProvider>
      </AuthProvider>
      <SpeedInsights />
    </div>
  );
}

export default App;