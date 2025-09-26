// Rule #1: When updating a file, if another file is going to be affected, update all affected files.
// Rule #2: File path locations and these rules are added to the top of each file.
// Rule #3: Full code is provided for copy and paste.
// Rule #4: A breakdown of tasks is given.
// Rule #5: If a file is not available, a request for it is made.
// Rule #6: the dashboard already and all files already created and structured.
// File path: components/pages/Agenda.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Calendar, 
  CalendarPlus, 
  CalendarSync, 
  CalendarSearch, 
  CalendarDays,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Bell,
  Plus,
  Filter,
  MoreHorizontal,
  Trash2,
  Edit3,
  Home,
  Pill,
  Settings,
  RefreshCw,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useHomeAssistant } from "@/contexts/HomeAssistantContext";
import { storage } from "@/lib/storage";
import { holidayService, Holiday } from "@/lib/holidays-service";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";

// Types for agenda items
interface AgendaEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  endTime?: string;
  source: "local" | "ha" | "google" | "outlook";
  location?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  reminders?: number[]; // minutes before event
  color?: string;
  entityId?: string; // For HA calendar events
  createdAt: string;
  updatedAt: string;
}

interface TodoItem {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
  dueDate?: string;
  dueTime?: string;
  tags?: string[];
  category?: string;
  relatedEntity?: string; // Link to HA entity
  estimatedMinutes?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface Reminder {
  id: string;
  title: string;
  description?: string;
  time: string;
  date: string;
  linkedTo?: string; // Link to event/todo ID
  type: "medication" | "general" | "automation" | "maintenance";
  isRecurring?: boolean;
  recurrenceRule?: string;
  isActive: boolean;
  snoozeUntil?: string;
  createdAt: string;
  updatedAt: string;
}

interface GoogleCalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
}

interface CalendarSettings {
  defaultView: "day" | "week" | "month";
  startHour: number;
  endHour: number;
  enabledSources: string[];
  syncInterval: number;
  defaultReminderMinutes: number;
  autoCreateReminders: boolean;
  enabledHolidayTypes: string[];
  showHolidays: boolean;
  holidayCategories: string[];
}

// Default settings
const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  defaultView: "day",
  startHour: 6,
  endHour: 22,
  enabledSources: ["local", "ha"],
  syncInterval: 15,
  defaultReminderMinutes: 15,
  autoCreateReminders: true,
  enabledHolidayTypes: ["federal", "observance", "cultural"],
  showHolidays: true,
  holidayCategories: ["Federal Holiday", "Cultural", "Traditional"]
};

export default function Agenda() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>(DEFAULT_CALENDAR_SETTINGS);
  
  // Data states
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  
  // UI states
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isAddTodoOpen, setIsAddTodoOpen] = useState(false);
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Form states
  const [newEvent, setNewEvent] = useState<Partial<AgendaEvent>>({});
  const [newTodo, setNewTodo] = useState<Partial<TodoItem>>({});
  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({});
  
  const { entities, isConnected, callService } = useHomeAssistant();
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleSyncLoading, setGoogleSyncLoading] = useState(false);
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionLoading } = useSession();

  // Load data on component mount
  useEffect(() => {
    loadLocalData();
    loadSettings();
    loadHolidays();
    if (isConnected) {
      syncWithHomeAssistant();
    }
  }, [isConnected]);

  // Load holidays when date or settings change
  useEffect(() => {
    loadHolidays();
  }, [selectedDate, calendarSettings.enabledHolidayTypes, calendarSettings.showHolidays]);

  // Auto-sync every interval
  useEffect(() => {
    if (!isConnected || calendarSettings.syncInterval <= 0) return;
    
    const interval = setInterval(() => {
      syncWithHomeAssistant();
    }, calendarSettings.syncInterval * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isConnected, calendarSettings.syncInterval]);

  // Load data from localStorage
  const loadLocalData = useCallback(() => {
    const storedEvents = storage.general.get<AgendaEvent[]>("agenda_events") || [];
    const storedTodos = storage.general.get<TodoItem[]>("agenda_todos") || [];
    const storedReminders = storage.general.get<Reminder[]>("agenda_reminders") || [];
    
    setEvents(storedEvents);
    setTodos(storedTodos);
    setReminders(storedReminders);
  }, []);

  // Load settings
  const loadSettings = useCallback(() => {
    const settings = storage.general.get<CalendarSettings>("calendar_settings") || DEFAULT_CALENDAR_SETTINGS;
    setCalendarSettings(settings);
  }, []);

  // Load holidays for current year and selected date
  const loadHolidays = useCallback(() => {
    if (!calendarSettings.showHolidays) {
      setHolidays([]);
      return;
    }

    const year = selectedDate.getFullYear();
    const allHolidays = holidayService.getHolidaysForYear(year);
    
    // Filter by enabled types
    const filteredHolidays = allHolidays.filter(holiday => 
      calendarSettings.enabledHolidayTypes.includes(holiday.type)
    );
    
    setHolidays(filteredHolidays);
  }, [selectedDate, calendarSettings.showHolidays, calendarSettings.enabledHolidayTypes]);

  // Save data to localStorage
  const saveLocalData = useCallback(() => {
    storage.general.set("agenda_events", events);
    storage.general.set("agenda_todos", todos);
    storage.general.set("agenda_reminders", reminders);
  }, [events, todos, reminders]);

  // Save settings
  const saveSettings = useCallback((settings: CalendarSettings) => {
    storage.general.set("calendar_settings", settings);
    setCalendarSettings(settings);
  }, []);

  // Sync with Home Assistant
  const syncWithHomeAssistant = useCallback(async () => {
    if (!isConnected) {
      toast.error("Not connected to Home Assistant");
      return;
    }

    setIsSyncing(true);
    try {
      // Get calendar entities
      const calendarEntities = Object.entries(entities)
        .filter(([entityId]) => entityId.startsWith('calendar.'))
        .map(([entityId, entity]) => ({ entityId, entity }));

      // Fetch events from HA calendar entities
      const haEvents: AgendaEvent[] = [];
      for (const { entityId, entity } of calendarEntities) {
        try {
          // Get events for the next 30 days
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(startDate.getDate() + 30);
          
          const response = await fetch('/api/home-assistant/calendar-events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entity_id: entityId,
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString()
            })
          });

          if (response.ok) {
            const eventData = await response.json();
            const entityEvents = eventData.events?.map((event: any) => ({
              id: `ha_${entityId}_${event.uid || Math.random()}`,
              title: event.summary || 'Untitled Event',
              description: event.description,
              date: event.start?.date || event.start?.dateTime?.split('T')[0],
              time: event.start?.dateTime ? new Date(event.start.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'All Day',
              endTime: event.end?.dateTime ? new Date(event.end.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
              source: "ha" as const,
              location: event.location,
              entityId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })) || [];
            
            haEvents.push(...entityEvents);
          }
        } catch (error) {
          console.error(`Error fetching events from ${entityId}:`, error);
        }
      }

      // Merge HA events with local events (remove old HA events first)
      const localEvents = events.filter(e => e.source !== 'ha');
      setEvents([...localEvents, ...haEvents]);
      
      setLastSyncTime(new Date());
      toast.success(`Synced ${haEvents.length} events from Home Assistant`);
      
    } catch (error) {
      console.error('Sync error:', error);
      toast.error("Failed to sync with Home Assistant");
    } finally {
      setIsSyncing(false);
    }
  }, [isConnected, entities, events]);

  // Connect Google Calendar
  const connectGoogleCalendar = useCallback(async () => {
    if (!session?.user) {
      toast.error('Please log in first');
      return;
    }

    if (isGoogleConnected) {
      toast.warning('Google Calendar already connected');
      return;
    }

    try {
      setGoogleSyncLoading(true);
      const response = await fetch('/api/google/calendar/connect', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('bearer_token')}`
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Connection failed');
      }

      const { authUrl, success } = await response.json();
      
      if (!success || !authUrl) {
        throw new Error('Failed to generate auth URL');
      }

      // Open OAuth in popup for better UX
      const popup = window.open(
        authUrl, 
        'google-oauth', 
        'width=500,height=600,scrollbars=yes,resizable=yes,menubar=no'
      );

      if (!popup) {
        // Fallback to new tab if popup blocked
        window.open(authUrl, '_blank');
        toast.warning('Popup blocked - opening in new tab. Complete authorization then return here.');
      }

      // Listen for connection success (poll status every 2s for 60s)
      const checkConnection = async () => {
        const interval = setInterval(async () => {
          const statusResponse = await fetch('/api/google/calendar/status', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('bearer_token')}` }
          });
          
          if (statusResponse.ok) {
            const status = await statusResponse.json();
            if (status.connected) {
              clearInterval(interval);
              setIsGoogleConnected(true);
              toast.success('Google Calendar connected! Syncing events...');
              await syncWithGoogleCalendar(); // Auto-sync on connect
            }
          }
        }, 2000);

        // Stop checking after 60s
        setTimeout(() => clearInterval(interval), 60000);
      };

      checkConnection();
    } catch (error) {
      console.error('Connect error:', error);
      toast.error(`Failed to connect Google Calendar: ${error.message}`);
    } finally {
      setGoogleSyncLoading(false);
    }
  }, [session, isGoogleConnected]);

  // Disconnect Google Calendar
  const disconnectGoogleCalendar = useCallback(async () => {
    if (!session?.user || !isGoogleConnected) return;

    try {
      setGoogleSyncLoading(true);
      const response = await fetch('/api/google/calendar/disconnect', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('bearer_token')}` }
      });

      if (response.ok) {
        setIsGoogleConnected(false);
        // Remove Google events from state
        setEvents(prev => prev.filter(e => e.source !== 'google'));
        toast.success('Google Calendar disconnected successfully');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Disconnect failed');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error(`Failed to disconnect: ${error.message}`);
    } finally {
      setGoogleSyncLoading(false);
    }
  }, [session, isGoogleConnected]);

  // Check if Google Calendar is connected
  const checkGoogleConnection = useCallback(async () => {
    if (!session?.user) return;
    
    try {
      const response = await fetch('/api/google/calendar/status', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('bearer_token')}` }
      });
      
      if (response.ok) {
        const status = await response.json();
        setIsGoogleConnected(status.connected);
        
        if (status.needsRefresh && status.connected) {
          toast.warning('Google token expiring soon - refreshing...');
          // Auto-refresh if needed
          await fetch('/api/google/calendar/refresh', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('bearer_token')}` }
          });
        }
      } else if (response.status === 401) {
        setIsGoogleConnected(false);
      }
    } catch (error) {
      console.error('Connection check error:', error);
      setIsGoogleConnected(false);
    }
  }, [session]);

  // Sync with Google Calendar
  const syncWithGoogleCalendar = useCallback(async () => {
    if (!session?.user || !isGoogleConnected) {
      toast.error('Please connect Google Calendar first');
      return;
    }

    if (googleSyncLoading) return; // Prevent duplicate syncs

    setGoogleSyncLoading(true);
    try {
      const { searchParams } = new URL(window.location.href);
      const period = searchParams.get('period') || 'week';
      
      const response = await fetch(`/api/google/calendar/events?period=${period}&maxResults=50`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('bearer_token')}` }
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.code === 'NOT_CONNECTED') {
          setIsGoogleConnected(false);
          toast.error('Google Calendar disconnected - please reconnect');
        } else if (data.code === 'REFRESH_FAILED' || data.code === 'TOKEN_EXPIRED') {
          toast.error('Google token expired - reconnecting...');
          setIsGoogleConnected(false);
          await connectGoogleCalendar(); // Attempt reconnect
        } else {
          throw new Error(data.error || 'Sync failed');
        }
        return;
      }

      const { events: googleEvents, count, period: fetchedPeriod } = await response.json();
      
      // Map to AgendaEvent format (filter for selected date or upcoming)
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      
      const mappedEvents: AgendaEvent[] = googleEvents
        .filter((event: any) => {
          const eventDate = event.start_date;
          // Show today's or upcoming events within the period
          if (period === 'today') return eventDate === todayStr;
          return new Date(eventDate) >= new Date(selectedDateStr) && 
                 new Date(eventDate) <= new Date(new Date(selectedDateStr).getTime() + 7 * 24 * 60 * 60 * 1000);
        })
        .map((event: any) => ({
          id: `google_${event.id}`,
          title: event.title || 'Untitled Event',
          description: event.description,
          date: event.start_date,
          time: event.all_day ? 'All Day' : (event.start_time || 'TBD'),
          endTime: event.all_day || !event.end_time ? undefined : event.end_time,
          source: 'google' as const,
          location: event.location,
          color: '#4285f4', // Google blue
          reminders: [15, 60], // Default Google reminders
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

      // Merge: replace old Google events, keep others, sort by time
      const existingNonGoogle = events.filter(e => e.source !== 'google');
      const mergedEvents = [...existingNonGoogle, ...mappedEvents]
        .sort((a, b) => {
          if (a.time === 'All Day' && b.time !== 'All Day') return -1;
          if (a.time !== 'All Day' && b.time === 'All Day') return 1;
          return (a.time || '00:00').localeCompare(b.time || '00:00');
        });

      setEvents(mergedEvents);
      
      toast.success(`Synced ${mappedEvents.length} Google events for ${fetchedPeriod}`);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Google sync error:', error);
      toast.error(`Google sync failed: ${error.message}`);
      if (error.message.includes('expired') || error.message.includes('refresh')) {
        setIsGoogleConnected(false);
      }
    } finally {
      setGoogleSyncLoading(false);
    }
  }, [session, isGoogleConnected, googleSyncLoading, selectedDate, events]);

  // Add this new function after checkGoogleConnection
  const testGoogleConnectionAndPreview = useCallback(async () => {
    if (!session?.user || !isGoogleConnected) {
      toast.error('Please connect Google Calendar first');
      return;
    }

    if (googleSyncLoading) return;

    setGoogleSyncLoading(true);
    try {
      // Fetch recent events for preview
      const response = await fetch('/api/google/calendar/test-connection', {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('bearer_token')}`,
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({ maxResults: 5 }) // Limit to 5 for preview
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Test failed');
      }

      const { events: previewEvents, success, message } = await response.json();
      
      if (success && previewEvents && previewEvents.length > 0) {
        // Show preview dialog with real events
        const eventPreviews = previewEvents.map((event: any) => (
          <div key={event.id} className="border-b pb-2 last:border-b-0">
            <div className="font-medium text-sm">{event.summary || 'Untitled Event'}</div>
            <div className="text-xs text-muted-foreground">
              {event.start?.dateTime ? new Date(event.start.dateTime).toLocaleString() : 'All Day'}
              {event.location && ` • ${event.location}`}
            </div>
            {event.description && <p className="text-xs mt-1">{event.description}</p>}
          </div>
        ));

        // Use a simple toast or dialog - here using toast for brevity, but can enhance to dialog
        toast.success(
          <div>
            <strong>Connection successful!</strong>
            <div className="mt-1 text-sm max-h-40 overflow-y-auto">
              {eventPreviews}
            </div>
            <p className="text-xs mt-2 text-green-700">Preview of your upcoming events. Full sync in progress...</p>
          </div>,
          { duration: 8000 }
        );

        // Auto-sync full events after successful test
        await syncWithGoogleCalendar();
      } else {
        toast.info(
          <div>
            <strong>{message || 'Connected, but no events found'}</strong>
            <p className="text-xs mt-1">Add some events to your Google Calendar to see them here.</p>
          </div>
        );
      }
    } catch (error) {
      console.error('Test connection error:', error);
      toast.error(`Test failed: ${error.message}. Check console for details or reconnect.`);
      if (error.message.includes('expired') || error.message.includes('invalid')) {
        setIsGoogleConnected(false);
      }
    } finally {
      setGoogleSyncLoading(false);
    }
  }, [session, isGoogleConnected, googleSyncLoading, syncWithGoogleCalendar]);

  // Update filteredEvents to include Google source in filter
  const filteredEvents = events.filter(event => {
    const matchesSearch = !searchQuery || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = filterSource === 'all' || event.source === filterSource;
    const matchesDate = event.date === selectedDate.toISOString().split('T')[0];
    
    return matchesSearch && matchesSource && matchesDate;
  });

  // Get holidays for selected date
  const dayHolidays = holidays.filter(holiday => 
    holiday.date === selectedDate.toISOString().split('T')[0]
  );

  // Combine events and holidays for display
  const combinedEvents = [
    ...filteredEvents.map(e => ({ ...e, source: e.source || 'local' })), // Ensure source exists
    ...(isGoogleConnected ? mappedEvents : []), // Add synced Google events
    ...dayHolidays.map(holiday => ({
      id: holiday.id,
      title: holiday.name,
      description: holiday.description,
      date: holiday.date,
      time: 'All Day',
      source: 'holiday' as const,
      color: holiday.color,
      category: holiday.category,
      type: holiday.type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))
  ].sort((a, b) => {
    // Sort all day events first, then by time
    if (a.time === 'All Day' && b.time !== 'All Day') return -1;
    if (a.time !== 'All Day' && b.time === 'All Day') return 1;
    if (a.time === 'All Day' && b.time === 'All Day') return 0;
    return a.time.localeCompare(b.time);
  });

  const filteredTodos = todos.filter(todo => {
    const matchesSearch = !searchQuery || 
      todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      todo.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const filteredReminders = reminders.filter(reminder => {
    const matchesSearch = !searchQuery || 
      reminder.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reminder.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = reminder.date === selectedDate.toISOString().split('T')[0];
    
    return matchesSearch && matchesDate && reminder.isActive;
  });

  // Stats
  const getUpcomingEvents = () => combinedEvents.slice(0, 3);
  const getTodayStats = () => {
    const totalEvents = combinedEvents.length;
    const regularEvents = filteredEvents.length;
    const holidayEvents = dayHolidays.length;
    const federalHolidays = dayHolidays.filter(h => h.type === 'federal').length;
    
    return { totalEvents, regularEvents, holidayEvents, federalHolidays };
  };
  
  const getTodoStats = () => {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const overdue = todos.filter(t => 
      t.dueDate && !t.completed && new Date(t.dueDate) < new Date()
    ).length;
    const high = todos.filter(t => t.priority === "high" && !t.completed).length;
    return { total, completed, overdue, high };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'medication': return <Pill className="h-4 w-4" />;
      case 'automation': return <Home className="h-4 w-4" />;
      case 'maintenance': return <AlertCircle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  // Sync all sources
  const syncAll = useCallback(async () => {
    if (isConnected) {
      await syncWithHomeAssistant();
    }
    if (isGoogleConnected) {
      await syncWithGoogleCalendar();
    }
  }, [isConnected, syncWithHomeAssistant, isGoogleConnected, syncWithGoogleCalendar]);

  // Load Google connection status
  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      toast.success('Google Calendar connected successfully!');
      // Clear the param
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session?.user) {
      // Redirect to login if not authenticated (assuming protected route)
      window.location.href = '/login';
      return;
    }
    checkGoogleConnection();
  }, [session, sessionLoading, checkGoogleConnection]);

  return (
    <div className="flex flex-col space-y-6">
      <Toaster />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Agenda</h1>
          <Badge variant="outline" className="text-xs">
            {formatDate(selectedDate)}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40"
            />
            <CalendarSearch className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="local">Local Only</SelectItem>
              <SelectItem value="ha">Home Assistant</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="holiday">Holidays</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Calendar Settings</DialogTitle>
                <DialogDescription>Configure your calendar preferences and holiday display</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Holiday Settings</h4>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-holidays"
                      checked={calendarSettings.showHolidays}
                      onCheckedChange={(checked) => 
                        saveSettings({ ...calendarSettings, showHolidays: checked })
                      }
                    />
                    <Label htmlFor="show-holidays">Show holidays in calendar</Label>
                  </div>
                  
                  {calendarSettings.showHolidays && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Holiday Types</Label>
                      {holidayService.getHolidayTypes().map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Switch
                            id={`holiday-${type}`}
                            checked={calendarSettings.enabledHolidayTypes.includes(type)}
                            onCheckedChange={(checked) => {
                              const updatedTypes = checked
                                ? [...calendarSettings.enabledHolidayTypes, type]
                                : calendarSettings.enabledHolidayTypes.filter(t => t !== type);
                              saveSettings({ ...calendarSettings, enabledHolidayTypes: updatedTypes });
                            }}
                          />
                          <Label htmlFor={`holiday-${type}`} className="capitalize">
                            {type} ({type === 'federal' ? 'Federal Holidays' : 
                             type === 'observance' ? 'National Observances' :
                             type === 'religious' ? 'Religious Holidays' :
                             type === 'cultural' ? 'Cultural Events' :
                             type === 'seasonal' ? 'Seasonal Events' :
                             'Awareness Months'})
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Sync Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sync-interval">Sync Interval (minutes)</Label>
                      <Input
                        id="sync-interval"
                        type="number"
                        min="0"
                        max="1440"
                        value={calendarSettings.syncInterval}
                        onChange={(e) => 
                          saveSettings({ ...calendarSettings, syncInterval: parseInt(e.target.value) || 15 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="default-reminder">Default Reminder (minutes)</Label>
                      <Input
                        id="default-reminder"
                        type="number"
                        min="0"
                        max="1440"
                        value={calendarSettings.defaultReminderMinutes}
                        onChange={(e) => 
                          saveSettings({ ...calendarSettings, defaultReminderMinutes: parseInt(e.target.value) || 15 })
                        }
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Google Calendar Integration</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Google Calendar Sync</Label>
                      <p className="text-xs text-muted-foreground mt-1">Connect your Google account to sync calendar events</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isGoogleConnected ? (
                        <Badge variant="default" className="text-xs">Connected</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Disconnected</Badge>
                      )}
                      <Button 
                        size="sm" 
                        variant={isGoogleConnected ? "destructive" : "default"}
                        onClick={isGoogleConnected ? disconnectGoogleCalendar : connectGoogleCalendar}
                        disabled={sessionLoading || !session?.user || (isGoogleConnected && googleSyncLoading)}
                      >
                        {googleSyncLoading ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : isGoogleConnected ? (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Disconnect
                          </>
                        ) : (
                          <>
                            <CalendarPlus className="h-4 w-4 mr-2" />
                            Connect
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {isGoogleConnected && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={testGoogleConnectionAndPreview}
                          disabled={googleSyncLoading}
                          className="w-full justify-start"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${googleSyncLoading ? 'animate-spin' : ''}`} />
                          Test Connection & Preview Events
                        </Button>
                        <p className="text-xs text-muted-foreground">Fetches your real upcoming events to confirm connection</p>
                      </div>
                      
                      <div className="pl-4 border-l-2 border-primary/20">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Auto-sync Google Events</Label>
                          <Switch
                            checked={calendarSettings.enabledSources.includes('google')}
                            onCheckedChange={(checked) => {
                              const updated = checked 
                                ? [...calendarSettings.enabledSources, 'google']
                                : calendarSettings.enabledSources.filter(s => s !== 'google');
                              saveSettings({ ...calendarSettings, enabledSources: updated });
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Events will sync automatically every {calendarSettings.syncInterval} minutes</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setIsSettingsOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={syncAll}
            disabled={isSyncing || googleSyncLoading || !isConnected && !isGoogleConnected}
          >
            <CalendarSync className={`h-4 w-4 mr-2 ${isSyncing || googleSyncLoading ? 'animate-spin' : ''}`} />
            Sync All
          </Button>
          
          <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <CalendarPlus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Event</DialogTitle>
                <DialogDescription>Create a new calendar event</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="event-title">Title</Label>
                  <Input
                    id="event-title"
                    value={newEvent.title || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Event title"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="event-description">Description</Label>
                  <Textarea
                    id="event-description"
                    value={newEvent.description || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Event description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="event-date">Date</Label>
                    <Input
                      id="event-date"
                      type="date"
                      value={newEvent.date || selectedDate.toISOString().split('T')[0]}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="event-time">Time</Label>
                    <Input
                      id="event-time"
                      type="time"
                      value={newEvent.time || ''}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="event-location">Location</Label>
                  <Input
                    id="event-location"
                    value={newEvent.location || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="Event location"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => addEvent(newEvent)}>Add Event</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Sync Status */}
      {lastSyncTime && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Last sync: {lastSyncTime.toLocaleTimeString()}</span>
              <Badge variant="secondary" className="text-xs">
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Today's Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTodayStats().totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              {getTodayStats().regularEvents} scheduled + {getTodayStats().holidayEvents} holidays
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Todo Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTodoStats().completed}/{getTodoStats().total}</div>
            <p className="text-xs text-muted-foreground">
              {getTodoStats().high > 0 && `${getTodoStats().high} high priority`}
              {getTodoStats().overdue > 0 && `, ${getTodoStats().overdue} overdue`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Active Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredReminders.length}</div>
            <p className="text-xs text-muted-foreground">
              For today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5" />
              Special Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTodayStats().holidayEvents}</div>
            <p className="text-xs text-muted-foreground">
              {getTodayStats().federalHolidays > 0 ? `${getTodayStats().federalHolidays} federal holiday${getTodayStats().federalHolidays > 1 ? 's' : ''}` : 'No federal holidays'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {combinedEvents.length > 0 ? (
                  combinedEvents.map((event) => (
                    <div key={event.id} className={`border rounded-lg p-4 hover:bg-muted/50 transition-colors ${
                      event.source === 'holiday' ? 'border-l-4' : ''
                    }`} style={event.source === 'holiday' && event.color ? { borderLeftColor: event.color } : {}}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{event.title}</h4>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                event.source === 'google' 
                                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                  : event.source === 'holiday' 
                                    ? event.type === 'federal' 
                                      ? 'bg-red-50 text-red-700 border-red-200' 
                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                    : ''
                              }`}
                            >
                              {event.source === "google" ? "Google" :
                               event.source === "local" ? "Local" : 
                               event.source === "holiday" ? 
                                 event.type === 'federal' ? 'Federal Holiday' :
                                 event.type === 'observance' ? 'Observance' :
                                 event.type === 'religious' ? 'Religious' :
                                 event.type === 'cultural' ? 'Cultural' :
                                 event.type === 'seasonal' ? 'Seasonal' :
                                 'Awareness' :
                               event.source.toUpperCase()}
                            </Badge>
                            {event.source === 'holiday' && event.type === 'federal' && (
                              <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                                Federal
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {event.time}
                            {event.endTime && ` - ${event.endTime}`}
                            {event.location && ` • ${event.location}`}
                            {event.category && ` • ${event.category}`}
                          </p>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                          )}
                        </div>
                        {event.source === 'local' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteEvent(event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No events or holidays for today</p>
                    {calendarSettings.showHolidays && (
                      <p className="text-xs mt-2">
                        Try enabling more holiday types in settings
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4">
          <Tabs defaultValue="todos" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="reminders">Reminders</TabsTrigger>
            </TabsList>
            
            <TabsContent value="todos">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">Todo List</CardTitle>
                  <Dialog open={isAddTodoOpen} onOpenChange={setIsAddTodoOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Todo</DialogTitle>
                        <DialogDescription>Create a new task</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="todo-title">Title</Label>
                          <Input
                            id="todo-title"
                            value={newTodo.title || ''}
                            onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                            placeholder="Task title"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="todo-description">Description</Label>
                          <Textarea
                            id="todo-description"
                            value={newTodo.description || ''}
                            onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                            placeholder="Task description"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="todo-priority">Priority</Label>
                            <Select 
                              value={newTodo.priority || 'medium'} 
                              onValueChange={(value: 'low' | 'medium' | 'high') => setNewTodo({ ...newTodo, priority: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="todo-due">Due Date</Label>
                            <Input
                              id="todo-due"
                              type="date"
                              value={newTodo.dueDate || ''}
                              onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => addTodo(newTodo)}>Add Todo</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredTodos.map((todo) => (
                      <div key={todo.id} className="flex items-start space-x-3 group">
                        <button
                          onClick={() => toggleTodo(todo.id)}
                          className="mt-1"
                        >
                          {todo.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {todo.title}
                          </p>
                          {todo.description && (
                            <p className="text-xs text-muted-foreground mt-1">{todo.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={`text-xs ${getPriorityColor(todo.priority)}`}>
                              {todo.priority}
                            </Badge>
                            {todo.dueDate && (
                              <span className="text-xs text-muted-foreground">
                                Due: {new Date(todo.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteTodo(todo.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {filteredTodos.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No todos found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="reminders">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">Reminders</CardTitle>
                  <Dialog open={isAddReminderOpen} onOpenChange={setIsAddReminderOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Reminder</DialogTitle>
                        <DialogDescription>Create a new reminder</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="reminder-title">Title</Label>
                          <Input
                            id="reminder-title"
                            value={newReminder.title || ''}
                            onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                            placeholder="Reminder title"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="reminder-date">Date</Label>
                            <Input
                              id="reminder-date"
                              type="date"
                              value={newReminder.date || selectedDate.toISOString().split('T')[0]}
                              onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="reminder-time">Time</Label>
                            <Input
                              id="reminder-time"
                              type="time"
                              value={newReminder.time || ''}
                              onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reminder-type">Type</Label>
                          <Select 
                            value={newReminder.type || 'general'} 
                            onValueChange={(value: 'medication' | 'general' | 'automation' | 'maintenance') => 
                              setNewReminder({ ...newReminder, type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="medication">Medication</SelectItem>
                              <SelectItem value="automation">Automation</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => addReminder(newReminder)}>Add Reminder</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredReminders.map((reminder) => (
                      <div key={reminder.id} className="border rounded-lg p-3 group">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(reminder.type)}
                              <h4 className="font-medium text-sm">{reminder.title}</h4>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {reminder.time} • {reminder.type}
                            </p>
                            {reminder.description && (
                              <p className="text-xs text-muted-foreground mt-2">{reminder.description}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteReminder(reminder.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {filteredReminders.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No reminders for today</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}