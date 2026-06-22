import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { orderApi } from '../api/orderApi';
import { supportApi } from '../api/supportApi';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const list = [];

      // Fetch orders to populate order updates
      const orderRes = await orderApi.getMyOrders();
      const orders = orderRes.data.orders || [];
      orders.forEach((o) => {
        // Add a notification for the current order status
        list.push({
          id: `order_${o._id}_${o.orderStatus}`,
          type: 'order',
          title: 'Order Status Update',
          message: `Order #${o._id.slice(-8).toUpperCase()} is currently ${o.orderStatus}.`,
          date: o.updatedAt || o.createdAt,
          isRead: false,
        });
      });

      // Fetch tickets to populate ticket alerts
      const ticketRes = await supportApi.getMyTickets();
      const tickets = ticketRes.data.tickets || [];
      tickets.forEach((t) => {
        if (t.messages && t.messages.length > 0) {
          const lastMsg = t.messages[t.messages.length - 1];
          if (lastMsg.senderType === 'admin') {
            list.push({
              id: `ticket_${t._id}_${lastMsg._id}`,
              type: 'support',
              title: 'Support Ticket Reply',
              message: `New reply from support on Ticket #${t._id.slice(-6).toUpperCase()}: "${lastMsg.message.slice(0, 30)}..."`,
              date: lastMsg.createdAt,
              isRead: false,
            });
          }
        }
      });

      // Filter read items stored in localStorage
      const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
      const finalNotifications = list.map((n) => {
        if (readIds.includes(n.id)) n.isRead = true;
        return n;
      });

      // Sort by date descending
      finalNotifications.sort((a, b) => new Date(b.date) - new Date(a.date));
      setNotifications(finalNotifications);
    } catch (_) {}
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      // Poll every 60 seconds
      const timer = setInterval(fetchNotifications, 60000);
      return () => clearInterval(timer);
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated, fetchNotifications]);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      const readIds = updated.map((n) => n.id);
      localStorage.setItem('read_notifications', JSON.stringify(readIds));
      return updated;
    });
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
      if (!readIds.includes(id)) readIds.push(id);
      localStorage.setItem('read_notifications', JSON.stringify(readIds));
      return updated;
    });
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAllAsRead,
      markAsRead,
      refresh: fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

export default NotificationContext;
