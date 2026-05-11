import { apiFetch } from './client';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export const getNotifications = async (token: string): Promise<Notification[]> => {
  return apiFetch<Notification[]>('/notifications', { token });
};

export const markNotificationAsRead = async (token: string, id: string): Promise<void> => {
  await apiFetch(`/notifications/${id}/read`, { token, method: 'PATCH' });
};

export const markAllNotificationsAsRead = async (token: string): Promise<void> => {
  await apiFetch('/notifications/read-all', { token, method: 'PATCH' });
};
