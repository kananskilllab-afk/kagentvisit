import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Analytics } from '@vercel/analytics/react';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NewVisit = lazy(() => import('./pages/NewVisit'));
const VisitsList = lazy(() => import('./pages/VisitsList'));
const AnalyticsPage = lazy(() => import('./pages/Analytics'));
const UserManagement = lazy(() => import('./pages/SuperAdmin/UserManagement'));
const PolicyConsole = lazy(() => import('./pages/SuperAdmin/PolicyConsole'));
const VisitPlanDetail = lazy(() => import('./pages/VisitPlanDetail'));
const FormBuilder = lazy(() => import('./pages/FormBuilder'));
const Profile = lazy(() => import('./pages/Profile'));
const ManageAgent = lazy(() => import('./pages/ManageAgent'));
const ExpenseList = lazy(() => import('./pages/Expenses/ExpenseList'));
const AddExpense = lazy(() => import('./pages/Expenses/AddExpense'));
const ClaimsList = lazy(() => import('./pages/Expenses/ClaimsList'));
const NewClaim = lazy(() => import('./pages/Expenses/NewClaim'));
const ClaimDetail = lazy(() => import('./pages/Expenses/ClaimDetail'));
const ExpenseAnalytics = lazy(() => import('./pages/Expenses/ExpenseAnalytics'));
const Calendar = lazy(() => import('./pages/Calendar'));
const PostFieldDay = lazy(() => import('./pages/PostFieldDay'));
const DailyReport = lazy(() => import('./pages/DailyReport'));
const PostDemoFeedback = lazy(() => import('./pages/PostDemoFeedback'));
const PostInPersonVisit = lazy(() => import('./pages/PostInPersonVisit'));
const FormsAdmin = lazy(() => import('./pages/FormsAdmin'));
const FormsHub = lazy(() => import('./pages/FormsHub'));
const DesignSystem = lazy(() => import('./pages/DesignSystem'));

const ProtectedRoute = ({ children, roles, formAccess }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
    if (formAccess && !['admin', 'superadmin'].includes(user.role) && !user.formAccess?.includes(formAccess)) {
        return <Navigate to="/" replace />;
    }
    return children;
};

const PageFallback = () => (
    <div className="min-h-dvh bg-slate-50 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-blue" />
    </div>
);

function App() {
    return (
        <>
            <Router>
                <Suspense fallback={<PageFallback />}>
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
                        <ProtectedRoute roles={['user', 'admin', 'superadmin', 'home_visit', 'hod', 'regional_bdm']}>
                            <VisitsList />
                        </ProtectedRoute>
                    } />
                    <Route path="analytics" element={
                        <ProtectedRoute roles={['admin', 'superadmin']}>
                            <AnalyticsPage />
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
                    <Route path="policies" element={
                        <ProtectedRoute roles={['superadmin']}>
                            <PolicyConsole />
                        </ProtectedRoute>
                    } />

                    {/* Visit Plans */}
                    <Route path="visit-plans/:id" element={
                        <ProtectedRoute roles={['user', 'admin', 'superadmin', 'home_visit', 'hod', 'accounts']}>
                            <VisitPlanDetail />
                        </ProtectedRoute>
                    } />
                    <Route path="agents" element={
                        <ProtectedRoute roles={['admin', 'superadmin']}>
                            <ManageAgent />
                        </ProtectedRoute>
                    } />

                    <Route path="post-field-day" element={
                        <ProtectedRoute formAccess="post_field_day">
                            <PostFieldDay />
                        </ProtectedRoute>
                    } />
                    <Route path="daily-report" element={
                        <ProtectedRoute formAccess="daily_report">
                            <DailyReport />
                        </ProtectedRoute>
                    } />
                    <Route path="post-demo-feedback" element={
                        <ProtectedRoute formAccess="post_demo_feedback">
                            <PostDemoFeedback />
                        </ProtectedRoute>
                    } />
                    <Route path="post-in-person-visit" element={
                        <ProtectedRoute formAccess="post_in_person_visit">
                            <PostInPersonVisit />
                        </ProtectedRoute>
                    } />
                    <Route path="forms" element={<FormsHub />} />
                    <Route path="forms-admin" element={
                        <ProtectedRoute roles={['admin', 'superadmin']}>
                            <FormsAdmin />
                        </ProtectedRoute>
                    } />

                    {/* Calendar */}
                    <Route path="calendar" element={
                        <ProtectedRoute roles={['user', 'admin', 'superadmin', 'home_visit', 'hod']}>
                            <Calendar />
                        </ProtectedRoute>
                    } />

                    {/* Expense Management */}
                    <Route path="expenses" element={
                        <ProtectedRoute roles={['user', 'admin', 'superadmin', 'accounts', 'home_visit', 'hod']}>
                            <ExpenseList />
                        </ProtectedRoute>
                    } />
                    <Route path="expenses/add" element={
                        <ProtectedRoute roles={['user', 'admin', 'superadmin', 'home_visit', 'hod']}>
                            <AddExpense />
                        </ProtectedRoute>
                    } />
                    <Route path="expenses/claims" element={
                        <ProtectedRoute roles={['user', 'admin', 'superadmin', 'accounts', 'home_visit', 'hod']}>
                            <ClaimsList />
                        </ProtectedRoute>
                    } />
                    <Route path="expenses/claims/new" element={
                        <ProtectedRoute roles={['user', 'admin', 'superadmin', 'home_visit', 'hod']}>
                            <NewClaim />
                        </ProtectedRoute>
                    } />
                    <Route path="expenses/claims/:id" element={
                        <ProtectedRoute roles={['user', 'admin', 'superadmin', 'accounts', 'home_visit', 'hod']}>
                            <ClaimDetail />
                        </ProtectedRoute>
                    } />
                    <Route path="expenses/analytics" element={
                        <ProtectedRoute roles={['admin', 'superadmin', 'accounts']}>
                            <ExpenseAnalytics />
                        </ProtectedRoute>
                    } />
                </Route>

                {import.meta.env.DEV && (
                    <Route path="/design-system" element={<DesignSystem />} />
                )}

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </Router>
        <Analytics />
        </>
    );
}

export default App;
