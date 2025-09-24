"use client";
import React, { useState } from "react";
import { Plus, Calendar, Clock } from "lucide-react";

export default function Agenda() {
  const [items, setItems] = useState([
    { id: 1, title: "Team Standup", time: "09:00 AM", date: "Today" },
    { id: 2, title: "Design Review", time: "11:00 AM", date: "Today" },
  ]);

  return (
    <div className="w-full max-w-md mx-auto bg-card rounded-xl shadow-subtle border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Agenda</h3>
        <button className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
          <Plus className="w-4 h-4 text-primary" />
        </button>
      </div>
      
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-all duration-200 border border-transparent hover:border-border/50"
          >
            <h4 className="font-medium mb-2">{item.title}</h4>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {item.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {item.time}
              </span>
            </div>
          </div>
        ))}
        
        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No items scheduled
          </div>
        )}
      </div>
    </div>
  );
}