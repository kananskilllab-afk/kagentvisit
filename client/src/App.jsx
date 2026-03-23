import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewVisit from './pages/NewVisit';
import VisitsList from './pages/VisitsList';
import Analytics from './pages/Analytics';
import UserManagement from './pages/SuperAdmin/UserManagement';
import FormBuilder from './pages/FormBuilder';
import Profile from './pages/Profile';
import ManageAgent from './pages/ManageAgent';

const ProtectedRoute = ({ children, roles }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
    return children;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/" element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Dashboard />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="new-visit" element={<NewVisit />} />
                    <Route path="edit-visit/:id" element={<NewVisit />} />
                    <Route path="visits" element={
                        <ProtectedRoute roles={['user', 'admin', 'superadmin', 'home_visit']}>
                            <VisitsList />
                        </ProtectedRoute>
                    } />
                    <Route path="analytics" element={
                        <ProtectedRoute roles={['admin', 'superadmin']}>
                            <Analytics />
                        </ProtectedRoute>
                    } />
                    <Route path="users" element={
                        <ProtectedRoute roles={['superadmin']}>
                            <UserManagement />
                        </ProtectedRoute>
                    } />
                    <Route path="form-builder" element={
                        <ProtectedRoute roles={['superadmin']}>
                            <FormBuilder />
                        </ProtectedRoute>
                    } />
                    <Route path="agents" element={
                        <ProtectedRoute roles={['admin', 'superadmin']}>
                            <ManageAgent />
                        </ProtectedRoute>
                    } />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
