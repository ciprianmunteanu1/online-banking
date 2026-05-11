import React, { useEffect, useState } from 'react';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  Notification,
} from '../api/notifications';
import { useNavigate } from 'react-router-dom';
import { useAuth, decodeEmail } from '../context/AuthContext';

export const NotificationsPage: React.FC = () => {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const email = accessToken ? decodeEmail(accessToken) : '';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!accessToken) return;
    try {
      const data = await getNotifications(accessToken);
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [accessToken]);

  const handleMarkRead = async (id: string) => {
    if (!accessToken) return;
    await markNotificationAsRead(accessToken, id);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    if (!accessToken) return;
    await markAllNotificationsAsRead(accessToken);
    fetchNotifications();
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="logo">
          <div className="logo-icon" style={{ width: 32, height: 32, fontSize: 16 }}>🏦</div>
          <div className="logo-name" style={{ fontSize: 17 }}>Secure<span>Bank</span></div>
        </div>
        <div className="topbar-right">
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="btn btn-ghost" onClick={() => navigate('/cards')}>Cards</button>
          <button className="btn btn-ghost" onClick={() => navigate('/transfer')}>Transfer</button>
          <button className="btn btn-ghost" onClick={() => navigate('/merchants/pay')}>Pay Merchant</button>
          <button className="btn btn-ghost" onClick={() => navigate('/transactions')}>History</button>
          <button className="btn btn-ghost" onClick={() => navigate('/statements')}>Statements</button>
          <button className="btn btn-ghost" onClick={() => navigate('/beneficiaries')}>Beneficiaries</button>
          <button className="btn btn-ghost" onClick={() => navigate('/notifications')} style={{ color: 'var(--accent)', background: 'rgba(99,102,241,0.1)' }}>Notifications</button>
          <button className="btn btn-ghost" onClick={() => navigate('/security')}>Security</button>
          <button className="btn btn-ghost" onClick={() => navigate('/admin/customers')}>Admin</button>
          <div className="user-chip"><span className="dot" />{email}</div>
          <button className="btn btn-ghost" onClick={() => { logout(); navigate('/'); }}>Sign out</button>
        </div>
      </header>

      <main className="main-content">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="section-title">
              Notifications {unreadCount > 0 && <span className="badge badge-posted" style={{ marginLeft: 8 }}>{unreadCount} new</span>}
            </h1>
            <p className="page-subtitle" style={{ marginTop: 4 }}>Security and account activity</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="btn btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}>
              Mark All as Read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-8" style={{ marginTop: 32 }}>
            <span className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--accent)' }} />
            <span className="text-muted">Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="alert alert-warn" style={{ marginTop: 20 }}>No notifications.</div>
        ) : (
          <div>
            {notifications.map((notif) => (
              <div key={notif.id} className={`notif-card ${notif.readAt ? 'read' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="notif-title">
                      {notif.title}
                      {!notif.readAt && <span className="dot" style={{ display: 'inline-block', width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%', marginLeft: 8, verticalAlign: 'middle' }} />}
                    </div>
                    <div className="notif-message">{notif.message}</div>
                    <div className="notif-footer">
                      <span className="badge badge-transfer">{notif.type.replace(/_/g, ' ')}</span>
                      <span style={{ marginLeft: 12 }}>{new Date(notif.createdAt).toLocaleString('ro-RO')}</span>
                    </div>
                  </div>
                  {!notif.readAt && (
                    <button onClick={() => handleMarkRead(notif.id)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
