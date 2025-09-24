"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LLMAssistantChat } from '@/components/ui/assistant-chat';
import { 
  Mic, 
  MicOff, 
  Wifi, 
  WifiOff, 
  Bot, 
  Home, 
  MessageSquare, 
  Lightbulb, 
  Thermometer, 
  Shield, 
  ChevronRight,
  Activity,
  Clock,
  Zap
} from 'lucide-react';

interface AssistantStatus {
  voice: boolean;
  internet: boolean;
  homeAssistant: boolean;
  llm: boolean;
  listening: boolean;
}

interface QuickStats {
  conversationsToday: number;
  commandsExecuted: number;
  devicesControlled: number;
  uptime: string;
}

export default function Assistant() {
  const [status, setStatus] = useState<AssistantStatus>({
    voice: true,
    internet: true,
    homeAssistant: true,
    llm: true,
    listening: false
  });

  const [stats, setStats] = useState<QuickStats>({
    conversationsToday: 12,
    commandsExecuted: 47,
    devicesControlled: 8,
    uptime: "2h 34m"
  });

  const [showHelperCards, setShowHelperCards] = useState(true);

  const quickCommands = [
    { icon: Thermometer, text: "Set thermostat to 72°", category: "Climate" },
    { icon: Lightbulb, text: "Turn on living room lights", category: "Lighting" },
    { icon: Shield, text: "Arm alarm in home mode", category: "Security" },
    { icon: Home, text: "Good morning routine", category: "Scenes" }
  ];

  const deviceStates = [
    { name: "Living Room", status: "3 lights on", icon: Lightbulb },
    { name: "Thermostat", status: "72°F", icon: Thermometer },
    { name: "Security", status: "Disarmed", icon: Shield },
    { name: "Garage", status: "Closed", icon: Home }
  ];

  useEffect(() => {
    // Simulate status updates
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        uptime: updateUptime(prev.uptime)
      }));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const updateUptime = (currentUptime: string): string => {
    const [hours, minutes] = currentUptime.split('h ');
    const h = parseInt(hours);
    const m = parseInt(minutes.replace('m', ''));
    
    if (m >= 59) {
      return `${h + 1}h 0m`;
    }
    return `${h}h ${m + 1}m`;
  };

  const getStatusColor = (isOnline: boolean) => 
    isOnline ? "text-green-500" : "text-red-500";

  const getStatusText = (isOnline: boolean) => 
    isOnline ? "Online" : "Offline";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Bot className="w-8 h-8 text-primary" />
                AI Assistant
              </h1>
              <p className="text-muted-foreground mt-1">
                Voice-enabled smart home control and information assistant
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowHelperCards(!showHelperCards)}
              className="hidden md:flex"
            >
              {showHelperCards ? "Hide Helpers" : "Show Helpers"}
            </Button>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {status.listening ? 
                      <Mic className="w-4 h-4 text-primary animate-pulse" /> : 
                      <MicOff className="w-4 h-4 text-muted-foreground" />
                    }
                    <span className="text-sm font-medium">Voice</span>
                  </div>
                  <Badge variant={status.voice ? "default" : "destructive"}>
                    {getStatusText(status.voice)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {status.internet ? 
                      <Wifi className="w-4 h-4 text-green-500" /> : 
                      <WifiOff className="w-4 h-4 text-red-500" />
                    }
                    <span className="text-sm font-medium">Internet</span>
                  </div>
                  <Badge variant={status.internet ? "default" : "destructive"}>
                    {getStatusText(status.internet)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className={`w-4 h-4 ${getStatusColor(status.homeAssistant)}`} />
                    <span className="text-sm font-medium">Home Hub</span>
                  </div>
                  <Badge variant={status.homeAssistant ? "default" : "destructive"}>
                    {getStatusText(status.homeAssistant)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className={`w-4 h-4 ${getStatusColor(status.llm)}`} />
                    <span className="text-sm font-medium">AI Service</span>
                  </div>
                  <Badge variant={status.llm ? "default" : "destructive"}>
                    {getStatusText(status.llm)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{stats.conversationsToday}</p>
                    <p className="text-sm text-muted-foreground">Conversations</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{stats.commandsExecuted}</p>
                    <p className="text-sm text-muted-foreground">Commands</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{stats.devicesControlled}</p>
                    <p className="text-sm text-muted-foreground">Devices</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{stats.uptime}</p>
                    <p className="text-sm text-muted-foreground">Uptime</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Interface */}
          <div className={`${showHelperCards ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-4`}>
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Chat with Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <LLMAssistantChat />
              </CardContent>
            </Card>
          </div>

          {/* Helper Cards */}
          {showHelperCards && (
            <div className="space-y-4">
              {/* Quick Commands */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Commands</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {quickCommands.map((command, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="w-full justify-start h-auto p-3 text-left"
                      onClick={() => {
                        // Handle quick command execution
                      }}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <command.icon className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{command.text}</p>
                          <p className="text-xs text-muted-foreground">{command.category}</p>
                        </div>
                        <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      </div>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Device States */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Device Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {deviceStates.map((device, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <device.icon className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{device.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{device.status}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Voice Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Voice Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>• Start with "Hey Assistant" or just speak naturally</p>
                    <p>• Be specific: "Turn on kitchen lights" vs "lights on"</p>
                    <p>• Ask questions: "What's the temperature?"</p>
                    <p>• Use scenes: "Good morning" or "Movie time"</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}