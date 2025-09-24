"use client";
import React from "react";

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <div className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Account</h2>
          <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Appearance</h2>
          <p className="text-muted-foreground">Customize the look and feel of your workspace.</p>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Notifications</h2>
          <p className="text-muted-foreground">Control how and when you receive notifications.</p>
        </div>
      </div>
    </div>
  );
}