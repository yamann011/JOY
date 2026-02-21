import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";

export interface AppNotification {
  id: string;
  type: "news" | "announcement";
  title: string;
  body: string;
  createdAt: string;
  href: string;
  read: boolean;
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [880, 1100, 1320];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  } catch {}
}

const STORAGE_KEY = "joy_notifications";
const SEEN_KEY = "joy_notifications_seen_at";
const POLL_INTERVAL = 30_000;

function loadStored(): AppNotification[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveStored(items: AppNotification[]) {
  // En fazla 50 bildirim tut
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(loadStored);
  const lastSeenRef = useRef<string>(
    localStorage.getItem(SEEN_KEY) || new Date(0).toISOString()
  );
  const prevNewsIdsRef = useRef<Set<string>>(new Set());
  const prevAnnIds = useRef<Set<string>>(new Set());
  const [, navigate] = useLocation();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveStored(updated);
      return updated;
    });
    const now = new Date().toISOString();
    localStorage.setItem(SEEN_KEY, now);
    lastSeenRef.current = now;
  }, []);

  const handleClick = useCallback(
    (notif: AppNotification) => {
      setNotifications((prev) => {
        const updated = prev.map((n) =>
          n.id === notif.id ? { ...n, read: true } : n
        );
        saveStored(updated);
        return updated;
      });
      navigate(notif.href);
    },
    [navigate]
  );

  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const poll = useCallback(async () => {
    try {
      const [newsRes, annRes] = await Promise.all([
        fetch("/api/news").catch(() => null),
        fetch("/api/announcements/active").catch(() => null),
      ]);

      const newItems: AppNotification[] = [];

      if (newsRes?.ok) {
        const newsList: any[] = await newsRes.json();
        newsList.forEach((item) => {
          if (
            !prevNewsIdsRef.current.has(item.id) &&
            prevNewsIdsRef.current.size > 0 &&
            item.createdAt > lastSeenRef.current
          ) {
            newItems.push({
              id: item.id,
              type: "news",
              title: "📰 Yeni Haber",
              body: item.title,
              createdAt: item.createdAt,
              href: `/news/${item.id}`,
              read: false,
            });
          }
          prevNewsIdsRef.current.add(item.id);
        });
      }

      if (annRes?.ok) {
        const ann: any = await annRes.json();
        if (ann && ann.id) {
          if (
            !prevAnnIds.current.has(ann.id) &&
            prevAnnIds.current.size > 0 &&
            ann.createdAt > lastSeenRef.current
          ) {
            newItems.push({
              id: ann.id,
              type: "announcement",
              title: "📢 Yeni Duyuru",
              body:
                ann.content?.substring(0, 80) + (ann.content?.length > 80 ? "…" : ""),
              createdAt: ann.createdAt,
              href: "/",
              read: false,
            });
          }
          prevAnnIds.current.add(ann.id);
        }
      }

      if (newItems.length > 0) {
        playNotificationSound();
        setNotifications((prev) => {
          const merged = [...newItems, ...prev];
          saveStored(merged);
          return merged;
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    poll();
    const timer = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [poll]);

  return { notifications, unreadCount, markAllRead, handleClick, clearAll };
}
