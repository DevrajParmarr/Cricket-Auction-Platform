"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface Event {
  id: number;
  name: string;
  status: string;
  allowed_domains: string[];
}

export default function OrganizerEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<"forbidden" | "failed" | null>(null);

  useEffect(() => {
    api
      .get("/organizer/events")
      .then(({ data }) => setEvents(data))
      .catch((err) => {
        // 401 = not signed in; 403 = signed in but not an organizer (don't pretend they're logged out)
        const status = err?.response?.status;
        if (status === 401) router.push("/auth/login");
        else setLoadError(status === 403 ? "forbidden" : "failed");
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <a href="/dashboard" className="text-gray-500 hover:text-white">← Dashboard</a>
          <h1 className="text-2xl font-bold">My Events</h1>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : loadError ? (
          <div className="card text-center py-10">
            <p className="text-white font-semibold">
              {loadError === "forbidden" ? "This page is for event organizers." : "Couldn't load your events."}
            </p>
            <p className="text-gray-500 mt-2">
              {loadError === "forbidden" ? "Your account doesn't have the organizer role." : "Check your connection and try again."}
            </p>
            <a href="/dashboard" className="btn-primary inline-block mt-5">Go to dashboard</a>
          </div>
        ) : events.length === 0 ? (
          <div className="card text-center text-gray-500 py-10">
            No events assigned. Ask admin to assign you as organizer.
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold">{event.name}</p>
                  <p className="text-sm text-gray-500">
                    Status: <span className="capitalize text-amber-400">{event.status}</span>
                  </p>
                </div>
                <button
                  className="btn-secondary text-sm"
                  onClick={() => router.push(`/organizer/events/${event.id}`)}
                >
                  Setup
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
