"use client";

import { useState, useEffect } from "react";
import { Camera, Video, VideoOff, Cctv, HardDrive, MonitorPlay, SwitchCamera, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Camera {
  id: string;
  name: string;
  connectionType: "rtsp" | "onvif" | "http" | "rtmp";
  url: string;
  username?: string;
  password?: string;
  status: "online" | "offline" | "connecting";
  lastMotion?: string;
  format?: string;
  resolution?: string;
  haEntity?: string;
}

interface Recording {
  id: string;
  cameraId: string;
  filename: string;
  timestamp: string;
  duration: number;
  size: number;
  trigger: "motion" | "schedule" | "manual";
}

interface RecordingRule {
  id: string;
  cameraId: string;
  name: string;
  trigger: "motion" | "schedule" | "sensor";
  schedule?: string;
  retentionDays: number;
  enabled: boolean;
}

export default function Cameras() {
  const [cameras, setCameras] = useState<Camera[]>([
    {
      id: "1",
      name: "Front Door",
      connectionType: "rtsp",
      url: "rtsp://192.168.1.100/stream1",
      status: "online",
      lastMotion: "2 min ago",
      format: "H.264",
      resolution: "1920x1080"
    },
    {
      id: "2", 
      name: "Living Room",
      connectionType: "onvif",
      url: "http://192.168.1.101/onvif",
      status: "online",
      format: "H.265",
      resolution: "1280x720"
    }
  ]);

  const [recordings, setRecordings] = useState<Recording[]>([
    {
      id: "1",
      cameraId: "1",
      filename: "front_door_20241201_143022.mp4",
      timestamp: "2024-12-01 14:30:22",
      duration: 120,
      size: 45.2,
      trigger: "motion"
    }
  ]);

  const [recordingRules, setRecordingRules] = useState<RecordingRule[]>([
    {
      id: "1",
      cameraId: "1",
      name: "Motion Detection",
      trigger: "motion",
      retentionDays: 7,
      enabled: true
    }
  ]);

  const [isAddCameraOpen, setIsAddCameraOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  const [storageUsed, setStorageUsed] = useState(156.8);
  const [storageTotal, setStorageTotal] = useState(500);

  const [newCamera, setNewCamera] = useState({
    name: "",
    connectionType: "rtsp" as const,
    url: "",
    username: "",
    password: "",
    format: "",
    resolution: "",
    haEntity: ""
  });

  const handleAddCamera = async () => {
    if (!newCamera.name || !newCamera.url) {
      toast.error("Please fill in required fields");
      return;
    }

    const camera: Camera = {
      id: Date.now().toString(),
      name: newCamera.name,
      connectionType: newCamera.connectionType,
      url: newCamera.url,
      username: newCamera.username || undefined,
      password: newCamera.password || undefined,
      status: "connecting",
      format: newCamera.format || undefined,
      resolution: newCamera.resolution || undefined,
      haEntity: newCamera.haEntity || undefined
    };

    setCameras(prev => [...prev, camera]);
    setIsAddCameraOpen(false);
    setNewCamera({
      name: "",
      connectionType: "rtsp",
      url: "",
      username: "",
      password: "",
      format: "",
      resolution: "",
      haEntity: ""
    });

    toast.success("Camera added successfully");

    // Simulate connection test
    setTimeout(() => {
      setCameras(prev => prev.map(c => 
        c.id === camera.id ? { ...c, status: "online" } : c
      ));
      toast.success(`${camera.name} connected successfully`);
    }, 2000);
  };

  const handleTestStream = async (camera: Camera) => {
    toast.info(`Testing stream for ${camera.name}...`);
    
    // Simulate stream test
    setTimeout(() => {
      toast.success(`Stream test successful - Format: H.264, Latency: 85ms`);
    }, 1500);
  };

  const handleSnapshot = (camera: Camera) => {
    toast.success(`Snapshot captured for ${camera.name}`);
  };

  const handleRecordNow = (camera: Camera) => {
    const recording: Recording = {
      id: Date.now().toString(),
      cameraId: camera.id,
      filename: `${camera.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().replace(/[:.]/g, '')}.mp4`,
      timestamp: new Date().toLocaleString(),
      duration: 0,
      size: 0,
      trigger: "manual"
    };

    setRecordings(prev => [recording, ...prev]);
    toast.success(`Recording started for ${camera.name}`);
  };

  const handleDeleteRecording = (recordingId: string) => {
    setRecordings(prev => prev.filter(r => r.id !== recordingId));
    toast.success("Recording deleted");
  };

  const getStatusBadge = (status: Camera["status"]) => {
    const variants = {
      online: "default",
      offline: "destructive", 
      connecting: "secondary"
    } as const;

    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    return `${bytes.toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cameras & NVR</h1>
          <p className="text-muted-foreground">
            Manage cameras, live feeds, and recording storage
          </p>
        </div>

        <Dialog open={isAddCameraOpen} onOpenChange={setIsAddCameraOpen}>
          <DialogTrigger asChild>
            <Button>
              <Camera className="h-4 w-4 mr-2" />
              Add Camera
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Camera</DialogTitle>
              <DialogDescription>
                Configure a new camera connection
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Camera Name *</Label>
                <Input
                  id="name"
                  value={newCamera.name}
                  onChange={(e) => setNewCamera(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Front Door"
                />
              </div>

              <div>
                <Label htmlFor="connectionType">Connection Type</Label>
                <Select
                  value={newCamera.connectionType}
                  onValueChange={(value: any) => setNewCamera(prev => ({ ...prev, connectionType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rtsp">RTSP</SelectItem>
                    <SelectItem value="onvif">ONVIF</SelectItem>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="rtmp">RTMP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="url">Stream URL *</Label>
                <Input
                  id="url"
                  value={newCamera.url}
                  onChange={(e) => setNewCamera(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="rtsp://192.168.1.100/stream1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={newCamera.username}
                    onChange={(e) => setNewCamera(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newCamera.password}
                    onChange={(e) => setNewCamera(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="format">Format</Label>
                  <Select
                    value={newCamera.format}
                    onValueChange={(value) => setNewCamera(prev => ({ ...prev, format: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="h264">H.264</SelectItem>
                      <SelectItem value="h265">H.265</SelectItem>
                      <SelectItem value="mjpeg">MJPEG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="resolution">Resolution</Label>
                  <Select
                    value={newCamera.resolution}
                    onValueChange={(value) => setNewCamera(prev => ({ ...prev, resolution: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1920x1080">1920x1080</SelectItem>
                      <SelectItem value="1280x720">1280x720</SelectItem>
                      <SelectItem value="640x480">640x480</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="haEntity">Home Assistant Entity (Optional)</Label>
                <Input
                  id="haEntity"
                  value={newCamera.haEntity}
                  onChange={(e) => setNewCamera(prev => ({ ...prev, haEntity: e.target.value }))}
                  placeholder="camera.front_door"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleAddCamera} className="flex-1">
                  Add Camera
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsAddCameraOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Camera Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cameras.map((camera) => (
              <Card key={camera.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{camera.name}</CardTitle>
                    {getStatusBadge(camera.status)}
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <Cctv className="h-4 w-4" />
                    {camera.connectionType.toUpperCase()}
                    {camera.format && (
                      <>
                        • {camera.format}
                        {camera.resolution && ` • ${camera.resolution}`}
                      </>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Live Preview Placeholder */}
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    {camera.status === "online" ? (
                      <div className="text-center">
                        <MonitorPlay className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Live Feed</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <VideoOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {camera.status === "connecting" ? "Connecting..." : "Offline"}
                        </p>
                      </div>
                    )}
                  </div>

                  {camera.lastMotion && (
                    <div className="text-sm text-muted-foreground">
                      Last motion: {camera.lastMotion}
                    </div>
                  )}

                  {/* Quick Controls */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSnapshot(camera)}
                      disabled={camera.status !== "online"}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRecordNow(camera)}
                      disabled={camera.status !== "online"}
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestStream(camera)}
                    >
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCamera(camera);
                        setIsFullViewOpen(true);
                      }}
                      disabled={camera.status !== "online"}
                      className="flex-1"
                    >
                      <SwitchCamera className="h-4 w-4 mr-2" />
                      Full View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Column - NVR Storage & Rules */}
        <div className="space-y-4">
          {/* Storage Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                NVR Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Used Space</span>
                  <span>{storageUsed} GB / {storageTotal} GB</span>
                </div>
                <Progress value={(storageUsed / storageTotal) * 100} />
              </div>

              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Recordings:</span>
                  <span>{recordings.length} files</span>
                </div>
                <div className="flex justify-between">
                  <span>Retention:</span>
                  <span>7 days avg</span>
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full">
                Manage Storage
              </Button>
            </CardContent>
          </Card>

          {/* Recording Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutList className="h-5 w-5" />
                Recording Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recordingRules.map((rule) => {
                const camera = cameras.find(c => c.id === rule.cameraId);
                return (
                  <div key={rule.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{rule.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {camera?.name} • {rule.trigger} • {rule.retentionDays}d
                      </div>
                    </div>
                    <Switch checked={rule.enabled} />
                  </div>
                );
              })}

              <Button variant="outline" size="sm" className="w-full">
                Add Rule
              </Button>
            </CardContent>
          </Card>

          {/* Recent Recordings */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Recordings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recordings.slice(0, 5).map((recording) => {
                const camera = cameras.find(c => c.id === recording.cameraId);
                return (
                  <div key={recording.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="space-y-1 flex-1">
                      <div className="font-medium text-sm">{camera?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {recording.timestamp} • {formatFileSize(recording.size)}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {recording.trigger}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full View Modal */}
      <Dialog open={isFullViewOpen} onOpenChange={setIsFullViewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedCamera?.name} - Live View</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="live" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="live">Live Feed</TabsTrigger>
              <TabsTrigger value="recordings">Recordings</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MonitorPlay className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">Live Feed Player</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCamera?.format} • {selectedCamera?.resolution}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                <Button variant="outline">
                  <Camera className="h-4 w-4 mr-2" />
                  Snapshot
                </Button>
                <Button variant="outline">
                  <Video className="h-4 w-4 mr-2" />
                  Record
                </Button>
                <Button variant="outline">Download Clip</Button>
              </div>
            </TabsContent>

            <TabsContent value="recordings" className="space-y-4">
              <div className="space-y-2">
                {recordings
                  .filter(r => r.cameraId === selectedCamera?.id)
                  .map((recording) => (
                    <div key={recording.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">{recording.filename}</div>
                        <div className="text-sm text-muted-foreground">
                          {recording.timestamp} • {formatDuration(recording.duration)} • {formatFileSize(recording.size)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{recording.trigger}</Badge>
                        <Button variant="outline" size="sm">Play</Button>
                        <Button variant="outline" size="sm">Download</Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRecording(recording.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Camera Name</Label>
                  <Input value={selectedCamera?.name || ""} readOnly />
                </div>
                <div>
                  <Label>Stream URL</Label>
                  <Input value={selectedCamera?.url || ""} readOnly />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Format</Label>
                    <Input value={selectedCamera?.format || "Auto"} readOnly />
                  </div>
                  <div>
                    <Label>Resolution</Label>
                    <Input value={selectedCamera?.resolution || "Auto"} readOnly />
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  Edit Camera Settings
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}