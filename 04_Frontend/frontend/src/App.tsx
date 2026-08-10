import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { BookingsPage } from './pages/BookingsPage';
import { CalendarPage } from './pages/CalendarPage';
import { SettingsPage } from './pages/SettingsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { AccountsPage } from './pages/AccountsPage';
import { GalleryPage } from './pages/GalleryPage';
import { AlbumsPage } from './pages/AlbumsPage';
import { StaffPage } from './pages/StaffPage';
import { ReportsPage } from './pages/ReportsPage';
import { PermissionRoute } from './routes/PermissionRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route
          path="accounts"
          element={
            <PermissionRoute permission="accounts.read">
              <AccountsPage />
            </PermissionRoute>
          }
        />
        <Route path="gallery" element={<GalleryPage />} />
        <Route path="albums" element={<AlbumsPage />} />
        <Route
          path="staff"
          element={
            <PermissionRoute permission="staff.read">
              <StaffPage />
            </PermissionRoute>
          }
        />
        <Route
          path="reports"
          element={
            <PermissionRoute permission="reports.read">
              <ReportsPage />
            </PermissionRoute>
          }
        />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
