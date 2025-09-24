"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Server, 
  ServerOff, 
  ServerCog, 
  MonitorCheck, 
  MonitorDown, 
  CloudCheck, 
  Cog, 
  Logs, 
  LayoutDashboard,
  PanelRight,
  ArrowUpAZ,
  ArrowDownZA
} from "lucide-react";
import { toast } from "sonner";

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  port?: number;
  lastSuccess?: string;
  info?: string;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  message: string;
}

interface ZWaveNode {
  id: number;
  name: string;
  manufacturer: string;
  lastSeen: string;
  battery?: number;
  status: 'online' | 'offline' | 'unknown';
}

interface DatabaseInfo {
  size: string;
  tables: string[];
  lastBackup?: string;
}

export default function System() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'SQLite DB', status: 'running', info: '45.2 MB', lastSuccess: 'Now' },
    { name: 'HA Connection', status: 'running', lastSuccess: '30 seconds ago' }
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: '2024-01-15 14:28:12', level: 'warn', service: 'HA', message: 'Connection timeout, retrying...' },
    { timestamp: '2024-01-15 14:27:33', level: 'info', service: 'SQLite', message: 'Database vacuum completed' }
  ]);

  const [zwaveNodes, setZwaveNodes] = useState<ZWaveNode[]>([
    { id: 1, name: 'Front Door Sensor', manufacturer: 'Aeotec', lastSeen: '2 min ago', battery: 95, status: 'online' },
    { id: 12, name: 'Living Room Dimmer', manufacturer: 'GE', lastSeen: '1 min ago', status: 'online' },
    { id: 24, name: 'Bedroom Motion', manufacturer: 'Fibaro', lastSeen: '5 min ago', battery: 85, status: 'online' }
  ]);

  const [dbInfo, setDbInfo] = useState<DatabaseInfo>({
    size: '45.2 MB',
    tables: ['automations', 'devices', 'logs', 'settings', 'energy_data'],
    lastBackup: '2024-01-14 20:00:00'
  });

  const [logFilter, setLogFilter] = useState<string>('all');
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [expandedServices, setExpandedServices] = useState<string[]>([]);

  const filteredLogs = logs.filter(log => 
    logFilter === 'all' || log.level === logFilter || log.service.toLowerCase() === logFilter.toLowerCase()
  );

  const toggleService = useCallback(async (serviceName: string) => {
    const service = services.find(s => s.name === serviceName);
    if (!service) return;

    const newStatus = service.status === 'running' ? 'stopped' : 'running';
    
    setServices(prev => prev.map(s => 
      s.name === serviceName 
        ? { ...s, status: newStatus, lastSuccess: newStatus === 'running' ? 'Now' : undefined }
        : s
    ));

    toast.success(`${serviceName} ${newStatus === 'running' ? 'started' : 'stopped'} successfully`);
  }, [services]);

  const restartService = useCallback(async (serviceName: string) => {
    setServices(prev => prev.map(s => 
      s.name === serviceName ? { ...s, status: 'stopped' } : s
    ));

    setTimeout(() => {
      setServices(prev => prev.map(s => 
        s.name === serviceName ? { ...s, status: 'running', lastSuccess: 'Now' } : s
      ));
      toast.success(`${serviceName} restarted successfully`);
    }, 1000);
  }, []);

  const runHealthCheck = useCallback(async () => {
    setIsHealthChecking(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const healthResults = [
      '✓ Home Assistant: Connected (192.168.1.100:8123)',
      '⚠ Database: Consider vacuum (45.2 MB)',
      '✓ OpenWeatherMap API: Responding'
    ];

    setIsHealthChecking(false);
    toast.success('Health check completed');
    
    // Add health check results to logs
    const newLog: LogEntry = {
      timestamp: new Date().toLocaleString(),
      level: 'info',
      service: 'System',
      message: `Health check completed: ${healthResults.join(', ')}`
    };
    setLogs(prev => [newLog, ...prev]);
  }, []);

  const vacuumDatabase = useCallback(async () => {
    toast.success('Database vacuum started...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    setDbInfo(prev => ({ ...prev, size: '41.8 MB' }));
    toast.success('Database vacuum completed');
  }, []);

  const backupDatabase = useCallback(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `homecontrol-backup-${timestamp}.db`;
    
    // Create a fake download
    const element = document.createElement('a');
    element.setAttribute('href', 'data:application/octet-stream;charset=utf-8,');
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    setDbInfo(prev => ({ ...prev, lastBackup: new Date().toLocaleString() }));
    toast.success(`Database backup saved as ${filename}`);
  }, []);

  const toggleServiceExpansion = useCallback((serviceName: string) => {
    setExpandedServices(prev => 
      prev.includes(serviceName) 
        ? prev.filter(s => s !== serviceName)
        : [...prev, serviceName]
    );
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Server className="h-4 w-4 text-green-600" />;
      case 'stopped': return <ServerOff className="h-4 w-4 text-red-600" />;
      case 'error': return <MonitorDown className="h-4 w-4 text-red-600" />;
      default: return <ServerOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      running: 'default',
      stopped: 'destructive',
      error: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Service Status Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((service) => (
          <Card key={service.name} className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(service.status)}
                  <div>
                    <p className="font-medium text-sm">{service.name}</p>
                    {service.port && (
                      <p className="text-xs text-muted-foreground">Port {service.port}</p>
                    )}
                    {service.info && (
                      <p className="text-xs text-muted-foreground">{service.info}</p>
                    )}
                  </div>
                </div>
                {getStatusBadge(service.status)}
              </div>
              {service.lastSuccess && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last success: {service.lastSuccess}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Controls */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ServerCog className="h-5 w-5" />
              Service Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {services.map((service) => (
              <div key={service.name} className="space-y-2">
                <Collapsible 
                  open={expandedServices.includes(service.name)}
                  onOpenChange={() => toggleServiceExpansion(service.name)}
                >
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 h-auto font-medium">
                        {service.name}
                      </Button>
                    </CollapsibleTrigger>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={service.status === 'running' ? 'destructive' : 'default'}
                        onClick={() => toggleService(service.name)}
                      >
                        {service.status === 'running' ? 'Stop' : 'Start'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restartService(service.name)}
                      >
                        Restart
                      </Button>
                    </div>
                  </div>
                  
                  <CollapsibleContent className="space-y-3 mt-3">
                    <div className="pl-4 border-l-2 border-muted space-y-2">
                      {service.port && (
                        <div>
                          <Label htmlFor={`port-${service.name}`} className="text-xs">Port</Label>
                          <Input
                            id={`port-${service.name}`}
                            type="number"
                            value={service.port}
                            className="h-8"
                            readOnly
                          />
                        </div>
                      )}
                      {service.name === 'MQTT Broker' && (
                        <div>
                          <Label htmlFor="mqtt-auth" className="text-xs">Authentication</Label>
                          <Select defaultValue="none">
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="basic">Username/Password</SelectItem>
                              <SelectItem value="tls">TLS Certificate</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                <Separator />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Logs and Diagnostics */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Logs className="h-5 w-5" />
                System Logs
              </div>
              <div className="flex items-center gap-2">
                <Select value={logFilter} onValueChange={setLogFilter}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="error">Errors</SelectItem>
                    <SelectItem value="warn">Warnings</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={runHealthCheck}
                  disabled={isHealthChecking}
                  className="flex items-center gap-1"
                >
                  <MonitorCheck className="h-4 w-4" />
                  {isHealthChecking ? 'Checking...' : 'Health Check'}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isHealthChecking && <Progress value={33} className="mb-4" />}
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {filteredLogs.map((log, index) => (
                  <div key={index} className="text-xs p-2 rounded border-l-2 border-l-primary/20 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-muted-foreground">{log.timestamp}</span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={log.level === 'error' ? 'destructive' : 
                                  log.level === 'warn' ? 'secondary' : 'default'}
                          className="text-xs"
                        >
                          {log.level}
                        </Badge>
                        <span className="text-primary font-medium">{log.service}</span>
                      </div>
                    </div>
                    <p className="mt-1">{log.message}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Database Tools */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              Database Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Database Size:</span>
                <span className="font-medium">{dbInfo.size}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tables:</span>
                <span className="font-medium">{dbInfo.tables.length}</span>
              </div>
              {dbInfo.lastBackup && (
                <div className="flex justify-between text-sm">
                  <span>Last Backup:</span>
                  <span className="font-medium text-xs">{dbInfo.lastBackup}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Button onClick={vacuumDatabase} className="w-full" size="sm">
                Vacuum Database
              </Button>
              <Button onClick={backupDatabase} variant="outline" className="w-full" size="sm">
                Create Backup
              </Button>
            </div>

            <Separator />

            <div>
              <Label className="text-xs">Tables</Label>
              <ScrollArea className="h-24 mt-1">
                <div className="space-y-1">
                  {dbInfo.tables.map((table) => (
                    <div key={table} className="text-xs p-1 rounded bg-muted/50">
                      {table}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}