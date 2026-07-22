import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { useBase } from './lib/airtable-hooks';
import { Header, AppView } from './components/Header';
import { NotificationsPanel } from './components/NotificationsPanel';
import { SnackbarProvider } from './components/SnackbarProvider';
import { CurrentUserProvider } from './hooks/useCurrentUser';
import { EventBusProvider } from './hooks/useEventBus';
import { AppLoading } from './components/AppLoading';
import { AppError } from './components/AppError';
import { AppRouter } from './components/AppRouter';
import { resolveRequiredTables, useServiceDeskData, ServiceDeskTables } from './hooks/useServiceDeskData';
import { useUnreadNotificationCount } from './hooks/useNotifications';

function App(): React.ReactElement {
  const { base, loading: baseLoading, error: baseError } = useBase();

  if (baseLoading) {
    return <AppLoading label="Loading Service Desk..." />;
  }

  if (baseError || !base) {
    return <AppError message={baseError?.message} />;
  }

  const tables = resolveRequiredTables(base);

  if (!tables) {
    return <AppError title="Missing tables" message="Required tables not found in the base." />;
  }

  return <ServiceDesk tables={tables} />;
}

function ServiceDesk({ tables }: { tables: ServiceDeskTables }) {
  const [view, setView] = useState<AppView>('home');
  const data = useServiceDeskData(tables, view);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <CurrentUserProvider
      techRecords={data.techRecords}
      peopleRecords={data.peopleRecords}
      peopleTable={tables.peopleTable}
      roleRecords={data.roleRecords}
      rolePermissionRecords={data.rolePermissionRecords}
    >
    <EventBusProvider historyTable={tables.historyTable} notificationsTable={tables.notificationsTable} techRecords={data.techRecords}>
      <ServiceDeskInner
        view={view}
        setView={setView}
        data={data}
        tables={tables}
        showNewTicket={showNewTicket}
        setShowNewTicket={setShowNewTicket}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
      />
    </EventBusProvider>
    </CurrentUserProvider>
  );
}

function ServiceDeskInner({
  view, setView, data, tables, showNewTicket, setShowNewTicket, showNotifications, setShowNotifications,
}: {
  view: AppView;
  setView: (v: AppView) => void;
  data: ReturnType<typeof useServiceDeskData>;
  tables: ServiceDeskTables;
  showNewTicket: boolean;
  setShowNewTicket: (v: boolean) => void;
  showNotifications: boolean;
  setShowNotifications: (v: boolean) => void;
}) {
  const unreadCount = useUnreadNotificationCount(data.notificationRecords, data.technicians);

  return (
    <div className="flex flex-col h-screen">
      <Header
        view={view}
        onViewChange={setView}
        onNewTicket={() => setShowNewTicket(true)}
        ticketCount={data.ticketRecords.length}
        unreadCount={unreadCount}
        onNotificationsClick={() => setShowNotifications(true)}
        peopleRecords={data.peopleRecords}
        softwareRecords={data.softwareRecords}
      />

      <AppRouter
        view={view}
        data={data}
        showNewTicket={showNewTicket}
        onCloseNewTicket={() => setShowNewTicket(false)}
      />

      <NotificationsPanel
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={data.notificationRecords}
        notificationsTable={tables.notificationsTable}
        onRefresh={data.refetchNotifications}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SnackbarProvider>
    <App />
  </SnackbarProvider>
);
