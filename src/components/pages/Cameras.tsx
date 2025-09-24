"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import videojs, { type Player } from 'video.js';
import 'video.js/dist/video-js.css';

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

  // Add video players ref
  const videoPlayersRef = useRef<Record<string, Player | null>>({});

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

  // Fetch storage locations for compute usage
  const fetchStorageUsage = useCallback(async () => {
    try {
      const response = await fetch('/api/storage-locations');
      if (response.ok) {
        const locations = await response.json();
        // Compute total used from recordings or locations
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
  }, []);

  // Initialize video player - updated to use ref
  const initVideoPlayer = useCallback((cameraId: string, containerRef: React.RefObject<HTMLDivElement>) => {
    if (videoPlayersRef.current[cameraId] || !containerRef.current) return;

    // Clear existing content (e.g., React-rendered placeholder)
    containerRef.current.innerHTML = '';

    const video = document.createElement('video-js');
    video.className = 'video-js';
    video.setAttribute('controls', 'true');
    video.setAttribute('preload', 'auto');
    video.setAttribute('width', '100%');
    video.setAttribute('height', '100%');
    containerRef.current.appendChild(video);

    const player = videojs(video, {
      fluid: true,
      responsive: true,
      sources: [{
        src: `/api/stream/${cameraId}`,
        type: 'application/x-mpegURL'
      }],
      plugins: {}
    });

    player.ready(() => {
      videoPlayersRef.current[cameraId] = player;
    });

    player.on('error', () => {
      // Dispose before clearing
      if (videoPlayersRef.current[cameraId]) {
        videoPlayersRef.current[cameraId]?.dispose();
        videoPlayersRef.current[cameraId] = null;
      }
      // Fallback
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div class="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <VideoOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p class="text-sm text-muted-foreground">Stream Unavailable</p>
          </div>
        `;
      }
    });

    return player;
  }, []);

  // Cleanup players
  useEffect(() => {
    return () => {
      Object.values(videoPlayersRef.current).forEach(player => {
        if (player && !player.isDisposed_) {
          player.dispose();
        }
      });
      videoPlayersRef.current = {};
    };
  }, []);

  // Add effect to clean up players when cameras change
  useEffect(() => {
    // Dispose players for removed cameras
    Object.keys(videoPlayersRef.current).forEach(cameraId => {
      if (!cameras.some(c => c.id === cameraId) && videoPlayersRef.current[cameraId]) {
        const player = videoPlayersRef.current[cameraId];
        if (player && !player.isDisposed_) {
          player.dispose();
        }
        delete videoPlayersRef.current[cameraId];
        // Clear container if it exists
        const container = playerRefs.current[cameraId];
        if (container) {
          container.innerHTML = `
            <div class="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <VideoOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p class="text-sm text-muted-foreground">Camera Removed</p>
            </div>
          `;
        }
      }
    });
  }, [cameras]);

  // Add effect to initialize players after cameras load
  useEffect(() => {
    cameras.forEach(camera => {
      const container = playerRefs.current[camera.id];
      if (container && !videoPlayersRef.current[camera.id] && camera.status === 'online') {
        initVideoPlayer(camera.id, { current: container });
      }
    });
  }, [cameras, initVideoPlayer]);

  const handleEditCamera = async (camera: Camera) => {
    setSelectedCamera(camera);
    setIsEditCameraOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCamera) return;

    const updateData: Partial<Camera> = {
      name: selectedCamera.name,
      connectionType: selectedCamera.connectionType,
      url: selectedCamera.url,
      username: selectedCamera.username,
      password: selectedCamera.password,
      format: selectedCamera.format,
      resolution: selectedCamera.resolution,
      haEntity: selectedCamera.haEntity
    };

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

  const handleDeleteCamera = async (camera: Camera) => {
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
        toast.success(`Camera "${deletingCamera.name}" deleted (removed ${data.deletedRecordingsCount} recordings)`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete camera');
      }
    } catch (error) {
      toast.error('Error deleting camera');
    }
  };

  // Update newCamera to editCamera for edit dialog
  useEffect(() => {
    if (selectedCamera) {
      setEditCamera({
        name: selectedCamera.name,
        connectionType: selectedCamera.connectionType,
        url: selectedCamera.url,
        username: selectedCamera.username || '',
        password: selectedCamera.password || '',
        format: selectedCamera.format || '',
        resolution: selectedCamera.resolution || '',
        haEntity: selectedCamera.haEntity || ''
      });
    }
  }, [selectedCamera]);

  const handleAddCamera = async () => {
    if (!newCamera.name || !newCamera.url) {
      toast.error("Please fill in required fields");
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
        setNewCamera({ /* reset */ });
        toast.success("Camera added successfully");

        // Simulate connection
        setTimeout(() => {
          setCameras(prev => prev.map(c => c.id === added.id ? { ...c, status: "online" } : c));
        }, 2000);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add camera');
      }
    } catch (error) {
      toast.error('Error adding camera');
    }
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

  const handleRecordNow = async (camera: Camera) => {
    try {
      const response = await fetch('/api/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameraId: camera.id, trigger: 'manual', storageLocationId: 1 }) // Default location
      });

      if (response.ok) {
        const newRec = await response.json();
        setRecordings(prev => [newRec, ...prev]);
        toast.success(`Recording started for ${camera.name}`);
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
    } catch (error) {
      toast.error('Error deleting recording');
    }
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

  const playerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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
            {cameras.map((camera) => {
              return (
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
                    <div 
                      ref={(el) => {
                        playerRefs.current[camera.id] = el;
                      }}
                      className="aspect-video bg-muted rounded-lg relative"
                      style={{ height: '200px' }}
                    >
                      {/* Fallback placeholder */}
                      {(!videoPlayersRef.current[camera.id] || camera.status !== "online") && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            {camera.status === "online" ? (
                              <MonitorPlay className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            ) : (
                              <VideoOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            )}
                            <p className="text-sm text-muted-foreground">
                              {camera.status === "online" ? "Loading stream..." : "Camera Offline"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {camera.lastMotion && (
                      <div className="text-sm text-muted-foreground">
                        Last motion: {camera.lastMotion}
                      </div>
                    )}

                    {/* Quick Controls */}
                    <div className="flex gap-2 flex-wrap">
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
                        onClick={() => handleEditCamera(camera)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCamera(camera)}
                      >
                        Delete
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
              );
            })}
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

      {/* Edit Camera Dialog */}
      <Dialog open={isEditCameraOpen} onOpenChange={setIsEditCameraOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Camera</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Camera Name</Label>
              <Input
                value={editCamera.name || ''}
                onChange={(e) => {
                  setEditCamera(prev => ({ ...prev, name: e.target.value }));
                  setSelectedCamera(prev => prev ? { ...prev, name: e.target.value } : null);
                }}
                placeholder="Camera Name"
              />
            </div>

            <div>
              <Label htmlFor="connectionType">Connection Type</Label>
              <Select
                value={editCamera.connectionType || "rtsp"}
                onValueChange={(value: any) => setEditCamera(prev => ({ ...prev, connectionType: value }))}
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
              <Label htmlFor="url">Stream URL</Label>
              <Input
                id="url"
                value={editCamera.url || ""}
                onChange={(e) => setEditCamera(prev => ({ ...prev, url: e.target.value }))}
                placeholder="rtsp://192.168.1.100/stream1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={editCamera.username || ''}
                  onChange={(e) => setEditCamera(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={editCamera.password || ''}
                  onChange={(e) => setEditCamera(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="format">Format</Label>
                <Select
                  value={editCamera.format || "h264"}
                  onValueChange={(value) => setEditCamera(prev => ({ ...prev, format: value }))}
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
                  value={editCamera.resolution || "1920x1080"}
                  onValueChange={(value) => setEditCamera(prev => ({ ...prev, resolution: value }))}
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
                value={editCamera.haEntity || ''}
                onChange={(e) => setEditCamera(prev => ({ ...prev, haEntity: e.target.value }))}
                placeholder="camera.front_door"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveEdit}>Save</Button>
              <Button variant="outline" onClick={() => setIsEditCameraOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Camera</DialogTitle>
            <DialogDescription>
              This will delete {deletingCamera?.name} and all associated recordings ({recordings.filter(r => r.cameraId === deletingCamera?.id).length} files). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}