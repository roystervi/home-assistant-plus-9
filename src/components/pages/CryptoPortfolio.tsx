"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Wifi,
  WifiOff,
  DollarSign,
  Coins
} from "lucide-react";
import { useHomeAssistant } from "@/contexts/HomeAssistantContext";

interface CryptoEntity {
  entityId: string;
  symbol: string;
  name: string;
  color: string;
}

interface CryptoHolding {
  entityId: string;
  symbol: string;
  name: string;
  color: string;
  currentPrice: number;
  holdings: number;
  currentValue: number;
  dailyPnL: number;
  dailyPnLPercentage: number;
  midnightPrice: number; // Price at midnight for P&L calculation
}

// Your specific crypto entities from Home Assistant
const CRYPTO_ENTITIES: CryptoEntity[] = [
  { entityId: "sensor.jasmy", symbol: "JASMY", name: "JasmyCoin", color: "#00D4FF" },
  { entityId: "sensor.shiba_inu", symbol: "SHIB", name: "Shiba Inu", color: "#F7931A" },
  { entityId: "sensor.doge", symbol: "DOGE", name: "Dogecoin", color: "#C2A633" },
  { entityId: "sensor.cronos", symbol: "CRO", name: "Cronos", color: "#103F68" },
  { entityId: "sensor.algorand", symbol: "ALGO", name: "Algorand", color: "#000000" },
  { entityId: "sensor.dogelon_mars", symbol: "ELON", name: "Dogelon Mars", color: "#D4AF37" },
  { entityId: "sensor.xrp", symbol: "XRP", name: "XRP", color: "#23292F" },
  { entityId: "sensor.spell", symbol: "SPELL", name: "Spell Token", color: "#6B46C1" },
];

export default function CryptoPortfolio() {
  const [cryptoHoldings, setCryptoHoldings] = useState<CryptoHolding[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [midnightPrices, setMidnightPrices] = useState<Record<string, number>>({});
  
  const { entities, isConnected, error: haError } = useHomeAssistant();

  // Load midnight prices from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('crypto-midnight-prices');
    if (stored) {
      try {
        const prices = JSON.parse(stored);
        setMidnightPrices(prices);
      } catch (error) {
        console.error('Failed to load midnight prices:', error);
      }
    }
  }, []);

  // Save midnight prices to localStorage
  const saveMidnightPrices = useCallback((prices: Record<string, number>) => {
    setMidnightPrices(prices);
    localStorage.setItem('crypto-midnight-prices', JSON.stringify(prices));
  }, []);

  // Check if it's midnight and reset P&L
  const checkMidnightReset = useCallback(() => {
    const now = new Date();
    const lastMidnight = new Date(now);
    lastMidnight.setHours(0, 0, 0, 0);
    
    const storedResetDate = localStorage.getItem('crypto-last-reset');
    const lastReset = storedResetDate ? new Date(storedResetDate) : null;
    
    // If we haven't reset today, capture current prices as midnight prices
    if (!lastReset || lastReset < lastMidnight) {
      const newMidnightPrices: Record<string, number> = {};
      
      CRYPTO_ENTITIES.forEach(crypto => {
        const entity = entities[crypto.entityId];
        if (entity && entity.attributes?.current_price) {
          newMidnightPrices[crypto.entityId] = parseFloat(entity.attributes.current_price);
        }
      });
      
      if (Object.keys(newMidnightPrices).length > 0) {
        saveMidnightPrices(newMidnightPrices);
        localStorage.setItem('crypto-last-reset', now.toISOString());
        toast.success("Daily P&L reset at midnight");
      }
    }
  }, [entities, saveMidnightPrices]);

  // Process crypto data from Home Assistant
  const processCryptoData = useCallback(() => {
    if (!entities || Object.keys(entities).length === 0) return;

    const holdings: CryptoHolding[] = [];
    
    CRYPTO_ENTITIES.forEach(crypto => {
      const entity = entities[crypto.entityId];
      
      if (entity && entity.attributes) {
        const currentPrice = parseFloat(entity.attributes.current_price || entity.state || '0');
        const holdingsAmount = parseFloat(entity.attributes.holdings || '0');
        const midnightPrice = midnightPrices[crypto.entityId] || currentPrice;
        
        const currentValue = currentPrice * holdingsAmount;
        const midnightValue = midnightPrice * holdingsAmount;
        const dailyPnL = currentValue - midnightValue;
        const dailyPnLPercentage = midnightValue > 0 ? (dailyPnL / midnightValue) * 100 : 0;
        
        holdings.push({
          entityId: crypto.entityId,
          symbol: crypto.symbol,
          name: crypto.name,
          color: crypto.color,
          currentPrice,
          holdings: holdingsAmount,
          currentValue,
          dailyPnL,
          dailyPnLPercentage,
          midnightPrice
        });
      } else {
        // Add entity with no data if entity doesn't exist
        holdings.push({
          entityId: crypto.entityId,
          symbol: crypto.symbol,
          name: crypto.name,
          color: crypto.color,
          currentPrice: 0,
          holdings: 0,
          currentValue: 0,
          dailyPnL: 0,
          dailyPnLPercentage: 0,
          midnightPrice: 0
        });
      }
    });
    
    setCryptoHoldings(holdings);
    setLastUpdate(new Date());
  }, [entities, midnightPrices]);

  // Initial data processing and midnight check
  useEffect(() => {
    if (entities && Object.keys(entities).length > 0) {
      checkMidnightReset();
      processCryptoData();
    }
  }, [entities, checkMidnightReset, processCryptoData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        processCryptoData();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [isConnected, processCryptoData]);

  // Manual refresh
  const handleRefresh = async () => {
    setLoading(true);
    try {
      processCryptoData();
      toast.success("Crypto data refreshed");
    } catch (error) {
      toast.error("Failed to refresh crypto data");
    } finally {
      setLoading(false);
    }
  };

  // Format price based on value magnitude
  const formatPrice = (price: number): string => {
    if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else if (price >= 0.01) {
      return `$${price.toFixed(4)}`;
    } else if (price >= 0.0001) {
      return `$${price.toFixed(6)}`;
    } else {
      return `$${price.toFixed(8)}`;
    }
  };

  // Format holdings amount
  const formatHoldings = (amount: number): string => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    } else {
      return amount.toFixed(2);
    }
  };

  // Calculate totals
  const totalValue = cryptoHoldings.reduce((sum, holding) => sum + holding.currentValue, 0);
  const totalDailyPnL = cryptoHoldings.reduce((sum, holding) => sum + holding.dailyPnL, 0);
  const totalDailyPercentage = totalValue > 0 ? (totalDailyPnL / (totalValue - totalDailyPnL)) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Crypto Portfolio</h1>
          <p className="text-muted-foreground">
            Track your cryptocurrency investments with live Home Assistant data
            {!isConnected && (
              <span className="text-destructive"> • Home Assistant not connected</span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="outline" className="gap-1">
              <Wifi className="h-3 w-3 text-green-500" />
              Live Data
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <WifiOff className="h-3 w-3 text-red-500" />
              Offline
            </Badge>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              {cryptoHoldings.length} assets tracked
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily P&L</CardTitle>
            {totalDailyPnL >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalDailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalDailyPnL >= 0 ? '+' : ''}${totalDailyPnL.toFixed(2)}
            </div>
            <p className={`text-xs ${totalDailyPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalDailyPercentage >= 0 ? '+' : ''}{totalDailyPercentage.toFixed(2)}% since midnight
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Update</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">
              Auto-refresh every 30s
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Holdings List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Crypto Holdings</CardTitle>
          <p className="text-sm text-muted-foreground">
            Live data from Home Assistant • P&L resets daily at midnight
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {cryptoHoldings.map((holding) => (
                <div key={holding.entityId} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: holding.color }}
                      >
                        {holding.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium">{holding.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {holding.symbol} • {holding.entityId}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-medium">
                        ${holding.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className={`text-sm ${holding.dailyPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {holding.dailyPnL >= 0 ? '+' : ''}${holding.dailyPnL.toFixed(2)} ({holding.dailyPnLPercentage >= 0 ? '+' : ''}{holding.dailyPnLPercentage.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Current Price</Label>
                      <div className="font-medium">{formatPrice(holding.currentPrice)}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Holdings</Label>
                      <div className="font-medium">{formatHoldings(holding.holdings)}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Midnight Price</Label>
                      <div className="font-medium">{formatPrice(holding.midnightPrice)}</div>
                    </div>
                  </div>
                  
                  <Separator />
                </div>
              ))}
              
              {cryptoHoldings.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  {loading ? (
                    "Loading crypto data..."
                  ) : !isConnected ? (
                    "Not connected to Home Assistant"
                  ) : (
                    "No crypto data available"
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}