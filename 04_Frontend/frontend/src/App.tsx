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
import { ExpensesPage } from './pages/ExpensesPage';
import { GalleryPage } from './pages/GalleryPage';
import { AlbumsPage } from './pages/AlbumsPage';
import { StaffPage } from './pages/StaffPage';
import { UsersPage } from './pages/UsersPage';
import { DeliveriesPage } from './pages/DeliveriesPage';
import { EquipmentPage } from './pages/EquipmentPage';
import { ReportsPage } from './pages/ReportsPage';
import { UiPrototypePage } from './pages/UiPrototypePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AuthSessionBootstrap } from './components/auth/AuthSessionBootstrap';
import { PermissionRoute } from './routes/PermissionRoute';

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<ErpRoutes />} />
    </Routes>
  );
}

function ErpRoutes() {
  return (
    <AuthSessionBootstrap>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/ui-prototype"
          element={
            <ProtectedRoute>
              <UiPrototypePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <PermissionRoute permission="dashboard.read">
                <DashboardPage />
              </PermissionRoute>
            }
          />
          <Route
            path="clients"
            element={
              <PermissionRoute permission="clients.read">
                <ClientsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="bookings"
            element={
              <PermissionRoute permission="bookings.read">
                <BookingsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="calendar"
            element={
              <PermissionRoute permission="bookings.read">
                <CalendarPage />
              </PermissionRoute>
            }
          />
          <Route
            path="invoices"
            element={
              <PermissionRoute permission="invoices.read">
                <InvoicesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="accounts"
            element={
              <PermissionRoute permission="accounts.read">
                <AccountsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="expenses"
            element={
              <PermissionRoute permission="expenses.read">
                <ExpensesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="gallery"
            element={
              <PermissionRoute permission="gallery.read">
                <GalleryPage />
              </PermissionRoute>
            }
          />
          <Route
            path="albums"
            element={
              <PermissionRoute permission="album.read">
                <AlbumsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="deliveries"
            element={
              <PermissionRoute permission="delivery.read">
                <DeliveriesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="equipment"
            element={
              <PermissionRoute permission="equipment.read">
                <EquipmentPage />
              </PermissionRoute>
            }
          />
          <Route
            path="staff"
            element={
              <PermissionRoute permission="staff.read">
                <StaffPage />
              </PermissionRoute>
            }
          />
          <Route
            path="users"
            element={
              <PermissionRoute permission="users.read">
                <UsersPage />
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
          <Route
            path="settings"
            element={
              <PermissionRoute permission="settings.read">
                <SettingsPage />
              </PermissionRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthSessionBootstrap>
  );
}
