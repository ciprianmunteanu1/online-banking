import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getNotifications, Notification } from '../api/notifications';
import { useAuth } from '../context/AuthContext';

function ToastItem({ toast, onClose }: { toast: Notification, onClose: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  return (
    <div className="toast card">
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        <div className="toast-message">{toast.message}</div>
      </div>
      <button className="toast-close btn-ghost" onClick={() => onClose(toast.id)}>&times;</button>
    </div>
  );
}

const getStoredSeenIds = (): Set<string> => {
  try {
    const stored = sessionStorage.getItem('seenNotifIds');
    if (stored) return new Set(JSON.parse(stored));
  } catch (e) {}
  return new Set();
};

const storeSeenIds = (ids: Set<string>) => {
  try {
    sessionStorage.setItem('seenNotifIds', JSON.stringify(Array.from(ids)));
  } catch (e) {}
};

export function NotificationToaster() {
  const { accessToken } = useAuth();
  const location = useLocation();
  const [toasts, setToasts] = useState<Notification[]>([]);
  
  const seenIds = useRef<Set<string>>(getStoredSeenIds());
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (!accessToken) return;
    
    let isMounted = true;
    
    const fetchNotifs = async () => {
      try {
        const notifs = await getNotifications(accessToken);
        if (!isMounted) return;
        
        let updated = false;
        
        if (!initialLoadDone.current && seenIds.current.size === 0) {
          notifs.forEach(n => seenIds.current.add(n.id));
          initialLoadDone.current = true;
          updated = true;
        } else {
          initialLoadDone.current = true;
          const newNotifs = notifs.filter(n => !n.readAt && !seenIds.current.has(n.id));
          if (newNotifs.length > 0) {
            newNotifs.forEach(n => seenIds.current.add(n.id));
            updated = true;
            setToasts(prev => [...prev, ...newNotifs]);
          }
        }
        
        if (updated) {
          storeSeenIds(seenIds.current);
        }
      } catch (err) {
        // ignore
      }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [accessToken]);

  const handleClose = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  if (['/', '/register', '/mfa'].includes(location.pathname)) {
    return null;
  }

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onClose={handleClose} />
      ))}
    </div>
  );
}
