"use client";

import { useState, useEffect, useCallback } from "react";
import { Camera as CameraIcon, HardDrive, LayoutList, SwitchCamera, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

// Import the new CameraCard
import CameraCard, { type Camera } from "@/components/CameraCard";

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
    },
    {
      id: "3",
      name: "Axis Camera",
      connectionType: "http",
      url: "http://root:root@192.168.1.156/axis-cgi/mjpg/video.cgi",
      status: "online",
      format: "MJPEG",
      resolution: "1920x1080"
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
  const [isEditCameraOpen, setIsEditCameraOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingCamera, setDeletingCamera] = useState<Camera | null>(null);
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

  const [editCamera, setEditCamera] = useState<Partial<Camera>>({});

  // Fetch cameras from API
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const response = await fetch('/api/cameras');
        if (response.ok) {
          const data = await response.json();
          setCameras(data);
        } else {
          toast.error('Failed to load cameras');
        }
      } catch (error) {
        toast.error('Error fetching cameras');
      }
    };
    fetchCameras();
  }, []);

  // Fetch recordings from API
  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        const response = await fetch('/api/recordings');
        if (response.ok) {
          const data = await response.json();
          setRecordings(data);
        }
      } catch (error) {
        toast.error('Error fetching recordings');
      }
    };
    fetchRecordings();
  }, []);

  // Fetch storage usage
  const fetchStorageUsage = useCallback(async () => {
    try {
      const response = await fetch('/api/storage-locations');
      if (response.ok) {
        const locations = await response.json();
        const totalUsed = locations.reduce((sum: number, loc: any) => sum + (loc.used || 0), 0);
        const totalCapacity = locations.reduce((sum: number, loc: any) => sum + (loc.capacity || 0), 0);
        setStorageUsed(totalUsed);
        setStorageTotal(totalCapacity);
      }
    } catch (error) {
      console.error('Error fetching storage');
    }
  }, []);

  useEffect(() => {
    fetchStorageUsage();
  }, [fetchStorageUsage]);

  const handleEditCamera = (camera: Camera) => {
    setSelectedCamera(camera);
    setEditCamera({
      name: camera.name,
      connectionType: camera.connectionType,
      url: camera.url,
      username: camera.username || '',
      password: camera.password || '',
      format: camera.format || '',
      resolution: camera.resolution || '',
      haEntity: camera.haEntity || ''
    });
    setIsEditCameraOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCamera) return;

    const updateData: Partial<Camera> = editCamera;

    try {
      const response = await fetch(`/api/cameras/${selectedCamera.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updated = await response.json();
        setCameras(prev => prev.map(c => c.id === updated.id ? updated : c));
        setIsEditCameraOpen(false);
        toast.success('Camera updated successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update camera');
      }
    } catch (error) {
      toast.error('Error updating camera');
    }
  };

  const handleDeleteCamera = (camera: Camera) => {
    setDeletingCamera(camera);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingCamera) return;

    try {
      const response = await fetch(`/api/cameras/${deletingCamera.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        setCameras(prev => prev.filter(c => c.id !== deletingCamera.id));
        setRecordings(prev => prev.filter(r => r.cameraId !== deletingCamera.id));
        setIsDeleteConfirmOpen(false);
        setDeletingCamera(null);
        toast.success(`Camera "${deletingCamera.name}" deleted (${data.deletedRecordingsCount || 0} recordings removed)`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete camera');
      }
    } catch (error) {
      toast.error('Error deleting camera');
    }
  };

  const handleAddCamera = async () => {
    if (!newCamera.name || !newCamera.url) {
      toast.error("Name and URL are required");
      return;
    }

    try {
      const response = await fetch('/api/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCamera)
      });

      if (response.ok) {
        const added = await response.json();
        setCameras(prev => [...prev, { ...added, status: 'connecting' }]);
        setIsAddCameraOpen(false);
        setNewCamera({
          name: "",
          connectionType: "rtsp" as const,
          url: "",
          username: "",
          password: "",
          format: "",
          resolution: "",
          haEntity: ""
        });
        toast.success("Camera added");

        // Simulate connection status update
        setTimeout(() => {
          setCameras(prev => 
            prev.map(c => c.id === added.id ? { ...c, status: "online" } : c)
          );
        }, 2000);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add camera');
      }
    } catch (error) {
      toast.error('Network error adding camera');
    }
  };

  const handleTestStream = (camera: Camera) => {
    toast.info(`Testing ${camera.name}...`);
    // Simulate test
    setTimeout(() => {
      toast.success(`${camera.name} stream: Connected (H.264, 1920x1080, 85ms latency)`);
    }, 1500);
  };

  const handleSnapshot = (camera: Camera) => {
    toast.success(`Snapshot saved for ${camera.name}`);
    // Could call API here
  };

  const handleRecordNow = async (camera: Camera) => {
    if (camera.status !== "online") {
      toast.error("Camera must be online to record");
      return;
    }

    try {
      const response = await fetch('/api/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cameraId: camera.id, 
          trigger: 'manual' as const, 
          duration: 30 // seconds
        })
      });

      if (response.ok) {
        const newRecording = await response.json();
        setRecordings(prev => [newRecording, ...prev]);
        toast.success(`Recording started: ${camera.name}`);
      } else {
        toast.error('Failed to start recording');
      }
    } catch (error) {
      toast.error('Error starting recording');
    }
  };

  const handleDeleteRecording = async (recordingId: string) => {
    try {
      const response = await fetch(`/api/recordings/${recordingId}`, { method: 'DELETE' });
      if (response.ok) {
        setRecordings(prev => prev.filter(r => r.id !== recordingId));
        toast.success("Recording deleted");
      } else {
        toast.error('Failed to delete recording');
      }
    } catch {
      toast.error('Error deleting recording');
    }
  };

  const handleFullView = (camera: Camera) => {
    setSelectedCamera(camera);
    setIsFullViewOpen(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const mb = bytes / 1024;
    return `${mb.toFixed(1)} MB`;
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
          <h1 className="text-2xl font-bold tracking-tight">Cameras & NVR</h1>
          <p className="text-muted-foreground">Manage security cameras and recording systems</p>
        </div>
        <Dialog open={isAddCameraOpen} onOpenChange={setIsAddCameraOpen}>
          <DialogTrigger asChild>
            <Button>
              <CameraIcon className="h-4 w-4 mr-2" />
              Add Camera
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Camera</DialogTitle>
              <DialogDescription>Configure new camera connection</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newCamera.name}
                  onChange={(e) => setNewCamera(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Front Door Camera"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={newCamera.connectionType} onValueChange={(val) => setNewCamera(prev => ({ ...prev, connectionType: val as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rtsp">RTSP</SelectItem>
                    <SelectItem value="onvif">ONVIF</SelectItem>
                    <SelectItem value="http">HTTP/MJPEG</SelectItem>
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
                  placeholder="rtsp://username:password@ip:port/stream"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="format">Format</Label>
                  <Select value={newCamera.format} onValueChange={(val) => setNewCamera(prev => ({ ...prev, format: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="H.264">H.264</SelectItem>
                      <SelectItem value="H.265">H.265</SelectItem>
                      <SelectItem value="MJPEG">MJPEG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="resolution">Resolution</Label>
                  <Select value={newCamera.resolution} onValueChange={(val) => setNewCamera(prev => ({ ...prev, resolution: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1920x1080">1080p</SelectItem>
                      <SelectItem value="1280x720">720p</SelectItem>
                      <SelectItem value="640x480">480p</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="haEntity">HA Entity ID (Optional)</Label>
                <Input
                  id="haEntity"
                  value={newCamera.haEntity}
                  onChange={(e) => setNewCamera(prev => ({ ...prev, haEntity: e.target.value }))}
                  placeholder="camera.front_door"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddCamera} className="flex-1">
                  Add Camera
                </Button>
                <Button variant="outline" onClick={() => setIsAddCameraOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Camera Grid + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cameras.map((camera) => (
              <CameraCard
                key={camera.id}
                camera={camera}
                onEdit={handleEditCamera}
                onDelete={handleDeleteCamera}
                onSnapshot={handleSnapshot}
                onRecord={handleRecordNow}
                onTest={handleTestStream}
                onFullView={handleFullView}
              />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          {/* Storage Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <HardDrive className="h-4 w-4" />
                Storage Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Used</span>
                  <span>{storageUsed.toFixed(1)} / {storageTotal} GB</span>
                </div>
                <Progress value={(storageUsed / storageTotal) * 100} className="h-2" />
              </div>
              <div className="text-xs space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Total Files</span>
                  <span>{recordings.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Retention</span>
                  <span>7 days</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                Manage Storage
              </Button>
            </CardContent>
          </Card>

          {/* Recording Rules */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <LayoutList className="h-4 w-4" />
                Rules ({recordingRules.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {recordingRules.map((rule) => {
                const cam = cameras.find(c => c.id === rule.cameraId);
                return (
                  <div key={rule.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cam?.name} • {rule.trigger} trigger • {rule.retentionDays} days
                      </p>
                    </div>
                    <Switch checked={rule.enabled} disabled />
                  </div>
                );
              })}
              <Button variant="outline" size="sm" className="w-full mt-2">
                + New Rule
              </Button>
            </CardContent>
          </Card>

          {/* Recent Recordings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent Recordings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {recordings.slice(0, 5).map((rec) => {
                const cam = cameras.find(c => c.id === rec.cameraId);
                return (
                  <div key={rec.id} className="flex items-center justify-between p-3 border rounded-md text-sm">
                    <div className="space-y-1 min-w-0">
                      <p className="font-medium truncate">{cam?.name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">
                        {rec.timestamp} • {formatDuration(rec.duration)} • {formatFileSize(rec.size * 1024 * 1024)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">{rec.trigger}</Badge>
                  </div>
                );
              })}
              {recordings.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No recordings yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full View Dialog */}
      <Dialog open={isFullViewOpen} onOpenChange={setIsFullViewOpen} modal={false}>
        <DialogContent className="max-w-6xl h-[90vh] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between pb-4 -mx-6">
            <DialogTitle className="text-xl">
              {selectedCamera?.name} - Live View
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsFullViewOpen(false)}>
              <SwitchCamera className="h-4 w-4 rotate-180" />
            </Button>
          </DialogHeader>

          <Tabs defaultValue="live" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="live">Live</TabsTrigger>
              <TabsTrigger value="recordings">Recordings</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="flex-1 p-0 overflow-hidden">
              <div className="flex-1 relative aspect-video bg-black rounded-md overflow-hidden">
                {/* Full screen video player container */}
                <div className="absolute inset-0">
                  {selectedCamera && (
                    <CameraCard
                      camera={selectedCamera}
                      onEdit={() => {}} // Disabled in modal
                      onDelete={() => {}}
                      onSnapshot={() => toast.success("Snapshot taken")}
                      onRecord={() => handleRecordNow(selectedCamera)}
                      onTest={() => handleTestStream(selectedCamera)}
                      onFullView={() => {}} // Already full
                    />
                  )}
                </div>
                {/* Controls overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSnapshot}>
                    <CameraIcon className="h-4 w-4 mr-1" />
                    Snapshot
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleRecordNow(selectedCamera!)}>
                    <Video className="h-4 w-4 mr-1" />
                    Record Now
                  </Button>
                  <Button variant="outline" size="sm">
                    PTZ Controls
                  </Button>
                </div>
              </div>
              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Format: {selectedCamera?.format || "Auto"}</span>
                  <span>Resolution: {selectedCamera?.resolution || "Auto"}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Status: {selectedCamera?.status}</span>
                  <span>Codec: H.264</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="recordings" className="space-y-4 overflow-y-auto p-4">
              <div className="space-y-3">
                {recordings
                  .filter(r => r.cameraId === selectedCamera?.id)
                  .map((rec) => (
                    <div key={rec.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                      <div className="space-y-2 flex-1">
                        <div className="font-medium">{rec.filename}</div>
                        <div className="text-sm text-muted-foreground space-x-4">
                          <span>{rec.timestamp}</span>
                          <span>• {formatDuration(rec.duration)}</span>
                          <span>• {formatFileSize(rec.size * 1024 * 1024)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{rec.trigger}</Badge>
                        <Button variant="outline" size="sm">Play</Button>
                        <Button variant="outline" size="sm">Download</Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRecording(rec.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                {recordings.filter(r => r.cameraId === selectedCamera?.id).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <VideoOff className="h-12 w-12 mx-auto mb-4" />
                    <p>No recordings found</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6 p-4 overflow-y-auto">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Camera Name</Label>
                    <Input value={selectedCamera?.name || ""} readOnly className="mt-1" />
                  </div>
                  <div>
                    <Label>Connection Type</Label>
                    <Input 
                      value={selectedCamera?.connectionType.toUpperCase() || ""} 
                      readOnly 
                      className="mt-1" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Stream URL</Label>
                    <Input 
                      value={selectedCamera?.url || ""} 
                      readOnly 
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label>Format</Label>
                    <Input value={selectedCamera?.format || "Auto"} readOnly className="mt-1" />
                  </div>
                  <div>
                    <Label>Resolution</Label>
                    <Input value={selectedCamera?.resolution || "Auto"} readOnly className="mt-1" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>HA Entity</Label>
                    <Input value={selectedCamera?.haEntity || "Not set"} readOnly className="mt-1" />
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Button onClick={handleEditCamera} className="w-full">
                    Edit Camera Settings
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditCameraOpen} onOpenChange={setIsEditCameraOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {selectedCamera?.name}</DialogTitle>
            <DialogDescription>Update camera configuration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editCamera.name || ""}
                onChange={(e) => setEditCamera(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select 
                value={editCamera.connectionType || "rtsp"} 
                onValueChange={(val) => setEditCamera(prev => ({ ...prev, connectionType: val as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rtsp">RTSP</SelectItem>
                  <SelectItem value="onvif">ONVIF</SelectItem>
                  <SelectItem value="http">HTTP/MJPEG</SelectItem>
                  <SelectItem value="rtmp">RTMP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>URL</Label>
              <Input
                value={editCamera.url || ""}
                onChange={(e) => setEditCamera(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Username</Label>
                <Input
                  value={editCamera.username || ""}
                  onChange={(e) => setEditCamera(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={editCamera.password || ""}
                  onChange={(e) => setEditCamera(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Format</Label>
                <Select value={editCamera.format || ""} onValueChange={(val) => setEditCamera(prev => ({ ...prev, format: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="H.264">H.264</SelectItem>
                    <SelectItem value="H.265">H.265</SelectItem>
                    <SelectItem value="MJPEG">MJPEG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Resolution</Label>
                <Select value={editCamera.resolution || ""} onValueChange={(val) => setEditCamera(prev => ({ ...prev, resolution: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1920x1080">1080p</SelectItem>
                    <SelectItem value="1280x720">720p</SelectItem>
                    <SelectItem value="640x480">480p</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>HA Entity</Label>
              <Input
                value={editCamera.haEntity || ""}
                onChange={(e) => setEditCamera(prev => ({ ...prev, haEntity: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveEdit} className="flex-1">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setIsEditCameraOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deletingCamera?.name}?</DialogTitle>
            <DialogDescription>
              This will permanently delete the camera and all {recordings.filter(r => r.cameraId === deletingCamera?.id).length} associated recordings.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete Camera
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}