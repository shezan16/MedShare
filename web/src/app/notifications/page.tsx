'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { notificationApi } from '@/lib/api';
import { NotificationItem } from '@/types';
import { Bell, Check, Heart, Pill, ShieldCheck, Clock, CheckCheck } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    notificationApi
      .getAll()
      .then((res) => {
        if (res.data?.data?.notifications) {
          setNotifications(res.data.data.notifications);
        }
      })
      .catch(() => {
        // Fallback demo notifications
        setNotifications([
          {
            id: 'n1',
            userId: 'u1',
            title: 'Emergency: O- Blood Needed Near You',
            message: 'Urgent emergency at Metropolitan Trauma Center for Robert Martinez. Distance: 0.15 km.',
            type: 'EMERGENCY_BLOOD',
            isRead: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'n2',
            userId: 'u1',
            title: 'Welcome to MedShare',
            message: 'Your account has been verified. Welcome to the RapidBlood & Medicine Redistribution community.',
            type: 'SYSTEM',
            isRead: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {}
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'EMERGENCY_BLOOD':
        return <Heart className="w-4 h-4 text-red-600 fill-red-600" />;
      case 'MEDICINE_UPDATE':
        return <Pill className="w-4 h-4 text-emerald-600" />;
      case 'VERIFICATION':
        return <ShieldCheck className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Notification Center
          </h1>
          <p className="text-xs text-slate-500">
            Real-time emergency blood dispatches, matching updates, and verification status.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
        >
          <CheckCheck className="w-4 h-4" /> Mark All as Read
        </button>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 space-y-2">
            <Bell className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">No notifications to display.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                n.isRead
                  ? 'bg-white border-slate-200/80 text-slate-600'
                  : 'bg-blue-50/50 border-blue-200 text-slate-900 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  {getIcon(n.type)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold">{n.title}</h3>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-100" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-400 block pt-0.5">
                    {new Date(n.createdAt).toLocaleDateString()} •{' '}
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {!n.isRead && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="text-xs text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-white transition-colors shrink-0"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
