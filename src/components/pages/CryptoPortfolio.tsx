"use client";
import React from "react";

export default function CryptoPortfolio() {
  return (
    <div className="p-8 rounded-xl bg-card border border-border shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Crypto Portfolio</h2>
        <div className="px-3 py-1 text-sm font-medium rounded-full bg-brand-soft text-brand">
          Coming Soon
        </div>
      </div>
      <div className="text-muted-foreground text-center py-12">
        <div className="text-5xl mb-4 opacity-40">₿</div>
        <p className="text-lg font-medium">Portfolio tracking is not available yet.</p>
        <p className="text-sm mt-2">We're working on bringing you comprehensive crypto portfolio management.</p>
      </div>
    </div>
  );
}