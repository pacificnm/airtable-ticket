import React from 'react';
import {
  AirtableRecord,
  Table,
  useUpdateRecord,
  useInspectAttrs,
} from '../lib/airtable-hooks';
import { useSnackbar } from './SnackbarProvider';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { timeAgo } from '../utils';
import { CloseIcon, MailIcon, DraftsIcon, NotificationsNoneIcon, DoneAllIcon } from './Icons';

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: AirtableRecord[];
  notificationsTable: Table;
  onRefresh: () => void;
}

export function NotificationsPanel({ open, onClose, notifications, notificationsTable, onRefresh }: NotificationsPanelProps) {
  const { mutate: updateNotification } = useUpdateRecord(notificationsTable);
  const { showSnackbar } = useSnackbar();
  const { currentUser } = useCurrentUser();

  const userNotifications = notifications.filter(n => {
    if (!currentUser) return false;

    const toName = n.getCellValueAsString('To Name');
    const toEmail = n.getCellValueAsString('To Email');
    return toName === currentUser.name || (currentUser.email && toEmail === currentUser.email);
  });

  const sorted = [...userNotifications].sort((a, b) => {
    const da = new Date(a.getCellValueAsString('Date Sent')).getTime() || 0;
    const db = new Date(b.getCellValueAsString('Date Sent')).getTime() || 0;
    return db - da;
  });

  const unreadCount = sorted.filter(n => !n.getCellValue('Read')).length;

  const handleMarkRead = async (record: AirtableRecord) => {
    try {
      await updateNotification({
        recordId: record.id,
        fields: { Read: true, 'Date Read': new Date().toISOString() },
      });
      onRefresh();
    } catch {
      showSnackbar('Failed to update notification', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    const unread = sorted.filter(n => !n.getCellValue('Read'));
    if (unread.length === 0) return;
    try {
      await Promise.all(
        unread.map(n =>
          updateNotification({
            recordId: n.id,
            fields: { Read: true, 'Date Read': new Date().toISOString() },
          })
        )
      );
      showSnackbar(`${unread.length} notification${unread.length > 1 ? 's' : ''} marked as read`);
      onRefresh();
    } catch {
      showSnackbar('Failed to mark all as read', 'error');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="fixed inset-0 bg-black/30 overlay-enter" onClick={onClose} />
      <div className="relative z-50 w-full sm:w-[400px] h-full bg-white flex flex-col sidesheet-enter">
        <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 bg-core_palette-primary-3 text-white">
          <div className="flex items-center gap-2">
            <NotificationsNoneIcon size={16} className="text-core_palette-primary-2" />
            <span className="text-[0.8125rem] font-semibold font-sans">Notifications</span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 text-[0.5625rem] font-bold bg-semantic-error text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 px-2 py-1 text-[0.6875rem] text-white/70 hover:text-white transition-colors"
              >
                <DoneAllIcon size={14} />
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="text-white/60 hover:text-white" aria-label="Close notifications">
              <CloseIcon size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="text-[rgba(202,209,211,0.5)] mb-4">
                <NotificationsNoneIcon size={48} />
              </div>
              <h3 className="text-[1rem] font-semibold text-semantic-text mb-1">No notifications</h3>
              <p className="text-[0.875rem] text-[#666666] max-w-[260px] leading-normal">
                You're all caught up. Notifications will appear here when there are updates to your tickets.
              </p>
            </div>
          ) : (
            sorted.map((notification, idx) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={() => handleMarkRead(notification)}
                showDivider={idx < sorted.length - 1}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
  showDivider,
}: {
  notification: AirtableRecord;
  onMarkRead: () => void;
  showDivider: boolean;
}) {
  const subjectAttrs = useInspectAttrs(notification, 'Subject');
  const subject = notification.getCellValueAsString('Subject');
  const body = notification.getCellValueAsString('Body');
  const from = notification.getCellValueAsString('From Name');
  const dateSent = notification.getCellValueAsString('Date Sent');
  const isRead = !!notification.getCellValue('Read');

  return (
    <>
      <div
        className={`px-5 py-3 transition-colors ${
          isRead ? 'bg-transparent hover:bg-[#FAFBFB]' : 'bg-[rgba(0,63,45,0.03)] hover:bg-[rgba(0,63,45,0.06)] cursor-pointer'
        }`}
        onClick={() => { if (!isRead) onMarkRead(); }}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">
            {isRead ? (
              <DraftsIcon size={18} className="text-[#999999]" />
            ) : (
              <MailIcon size={18} className="text-core_palette-primary-1" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {!isRead && (
                <span className="w-1.5 h-1.5 bg-[#E81717] flex-shrink-0" style={{ borderRadius: '50%' }} />
              )}
              <p
                {...subjectAttrs}
                className={`text-[0.8125rem] text-semantic-text truncate flex-1 ${isRead ? 'font-normal' : 'font-semibold'}`}
              >
                {subject}
              </p>
            </div>
            <p className="text-[0.75rem] text-[#666666] leading-normal line-clamp-2 mb-1">
              {body}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[0.6875rem] text-[#999999]">{from}</span>
              <span className="text-[0.6875rem] text-[#999999]">•</span>
              <span className="text-[0.6875rem] text-[#999999]">{dateSent ? timeAgo(dateSent) : ''}</span>
            </div>
          </div>
        </div>
      </div>
      {showDivider && <hr className="border-t border-[rgba(202,209,211,0.3)] m-0" />}
    </>
  );
}
