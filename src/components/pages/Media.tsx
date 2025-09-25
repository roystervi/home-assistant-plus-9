"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Music,
  Video,
  Network,
  Radio,
  Youtube,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Shuffle,
  Upload,
  Search,
  Plus,
  Trash2,
  Wifi,
  Server,
  Settings,
  List,
  Grid3X3
} from "lucide-react";

interface MediaFile {
  id: string;
  name: string;
  type: string;
  url: string;
  duration?: number;
  artist?: string;
  album?: string;
  thumbnail?: string;
}

interface Playlist {
  id: string;
  name: string;
  tracks: string[];
}

interface NetworkDevice {
  id: string;
  name: string;
  type: string;
  ip: string;
  status: "online" | "offline";
}

interface StreamStation {
  id: string;
  name: string;
  url: string;
  genre: string;
  quality: string;
}

interface YoutubeChannel {
  id: string;
  name: string;
  url: string;
  videos: YoutubeVideo[];
}

interface YoutubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelName: string;
}

export default function MediaPage() {
  const [activeTab, setActiveTab] = useState("music");
  
  // Audio/Video state
  const [currentMedia, setCurrentMedia] = useState<MediaFile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"none" | "one" | "all">("none");
  
  // File management
  const [musicFiles, setMusicFiles] = useState<MediaFile[]>([]);
  const [videoFiles, setVideoFiles] = useState<MediaFile[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  
  // Network
  const [networkDevices, setNetworkDevices] = useState<NetworkDevice[]>([]);
  const [streamStations, setStreamStations] = useState<StreamStation[]>([]);
  
  // YouTube
  const [youtubeChannels, setYoutubeChannels] = useState<YoutubeChannel[]>([]);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null); // Now used for visible video only
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLMediaElement>(null); // Unified ref for audio/video

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedMusic = localStorage.getItem("media-music-files");
      if (savedMusic) setMusicFiles(JSON.parse(savedMusic));
      
      const savedVideos = localStorage.getItem("media-video-files");
      if (savedVideos) setVideoFiles(JSON.parse(savedVideos));
      
      const savedPlaylists = localStorage.getItem("media-playlists");
      if (savedPlaylists) setPlaylists(JSON.parse(savedPlaylists));
      
      const savedStations = localStorage.getItem("media-stream-stations");
      if (savedStations) setStreamStations(JSON.parse(savedStations));
      
      const savedChannels = localStorage.getItem("media-youtube-channels");
      if (savedChannels) setYoutubeChannels(JSON.parse(savedChannels));
    } catch (e) {
      console.error("Failed to load media data:", e);
      localStorage.removeItem("media-music-files");
      localStorage.removeItem("media-video-files");
      localStorage.removeItem("media-playlists");
      localStorage.removeItem("media-stream-stations");
      localStorage.removeItem("media-youtube-channels");
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem("media-music-files", JSON.stringify(musicFiles));
  }, [musicFiles]);

  useEffect(() => {
    localStorage.setItem("media-video-files", JSON.stringify(videoFiles));
  }, [videoFiles]);

  useEffect(() => {
    localStorage.setItem("media-playlists", JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem("media-stream-stations", JSON.stringify(streamStations));
  }, [streamStations]);

  useEffect(() => {
    localStorage.setItem("media-youtube-channels", JSON.stringify(youtubeChannels));
  }, [youtubeChannels]);

  // Media controls
  const handlePlay = useCallback((media: MediaFile) => {
    if (currentMedia?.id === media.id) {
      // Toggle play/pause if same media
      setIsPlaying(!isPlaying);
    } else {
      // Switch to new media, start from beginning
      setCurrentMedia(media);
      setCurrentTime(0);
      setIsPlaying(true);
    }
    toast.success(`Now playing: ${media.name}`);
  }, [currentMedia?.id, isPlaying]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentMedia(null);
  }, []);

  // Media control useEffects
  useEffect(() => {
    if (currentMedia?.type.startsWith('audio/') && audioRef.current && currentMedia.url) {
      const audio = audioRef.current;
      if (audio.src !== currentMedia.url) {
        audio.src = currentMedia.url;
        audio.load();
      }
      if (isPlaying) {
        audio.play().catch(err => {
          setIsPlaying(false);
          toast.error(`Audio playback failed: ${err.message}`);
        });
      } else {
        audio.pause();
      }
    } else if (currentMedia?.type.startsWith('video/') && videoRef.current && currentMedia.url) {
      const video = videoRef.current;
      if (video.src !== currentMedia.url) {
        video.src = currentMedia.url;
        video.load();
      }
      if (isPlaying) {
        video.play().catch(err => {
          setIsPlaying(false);
          toast.error(`Video playback failed: ${err.message}`);
        });
      } else {
        video.pause();
      }
    }
  }, [currentMedia, isPlaying]);

  useEffect(() => {
    if (!currentMedia) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.currentTime = 0;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.currentTime = 0;
      }
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentMedia]);

  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLMediaElement>) => {
    setCurrentTime(e.currentTarget.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback((e: React.SyntheticEvent<HTMLMediaElement>) => {
    setDuration(e.currentTarget.duration);
  }, []);

  const handleSeekChange = useCallback((value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (audioRef.current) audioRef.current.currentTime = newTime;
    if (videoRef.current) videoRef.current.currentTime = newTime;
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) audioRef.current.volume = newVolume / 100;
    if (videoRef.current) videoRef.current.volume = newVolume / 100;
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (audioRef.current) audioRef.current.muted = newMuted;
    if (videoRef.current) videoRef.current.muted = newMuted;
  }, [isMuted]);

  // File upload handling
  const handleFileUpload = useCallback(async (files: FileList, type: "music" | "video") => {
    for (const file of Array.from(files)) {
      if (type === "music" && !file.type.startsWith('audio/')) {
        toast.error(`${file.name} is not a valid audio file.`);
        continue;
      }
      
      if (type === "video" && !file.type.startsWith('video/')) {
        toast.error(`${file.name} is not a valid video file.`);
        continue;
      }
      
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      toast.info(`Processing ${file.name}...`);
      
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
        
        const mediaFile: MediaFile = {
          id,
          name: file.name.replace(/\.[^/.]+$/, ""),
          type: file.type,
          url: dataUrl,
        };
        
        if (type === "music") {
          setMusicFiles(prev => [...prev, mediaFile]);
        } else {
          setVideoFiles(prev => [...prev, mediaFile]);
        }
        
        toast.success(`${file.name} uploaded and ready to play!`);
      } catch (err) {
        console.error('Upload error:', err);
        toast.error(`Failed to process ${file.name}`);
      }
    }
  }, [setMusicFiles, setVideoFiles]);

  const handleDrop = useCallback((e: React.DragEvent, type: "music" | "video") => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleFileUpload(files, type);
  }, [handleFileUpload]);

  // Filter media files based on search
  const filteredMusicFiles = musicFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.album?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVideoFiles = videoFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Media card component
  const MediaCard = ({ media, type, onPlay, onRemove }: {
    media: MediaFile;
    type: "music" | "video";
    onPlay: () => void;
    onRemove: () => void;
  }) => (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:scale-105">
      <div className="relative">
        {media.thumbnail && (
          <img
            src={media.thumbnail}
            alt={media.name}
            className="w-full h-32 object-cover rounded-t-lg"
          />
        )}
        {!media.thumbnail && (
          <div className="w-full h-32 bg-muted flex items-center justify-center rounded-t-lg">
            {type === "music" ? (
              <Music className="h-12 w-12 text-muted-foreground" />
            ) : (
              <Video className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-t-lg">
          <Button
            size="sm"
            variant="secondary"
            onClick={onPlay}
            className="mr-2"
          >
            <Play className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <CardContent className="p-4">
        <h4 className="font-medium truncate">{media.name}</h4>
        {media.artist && (
          <p className="text-sm text-muted-foreground truncate">{media.artist}</p>
        )}
        {media.duration && (
          <p className="text-xs text-muted-foreground">
            {Math.floor(media.duration / 60)}:{String(Math.floor(media.duration % 60)).padStart(2, '0')}
          </p>
        )}
      </CardContent>
    </Card>
  );

  // Upload area component
  const UploadArea = ({ type, accept }: { type: "music" | "video"; accept: string }) => (
    <div
      className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors duration-200"
      onDrop={(e) => handleDrop(e, type)}
      onDragOver={(e) => e.preventDefault()}
    >
      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-medium mb-2">Upload {type === "music" ? "Music" : "Videos"}</h3>
      <p className="text-muted-foreground mb-4">Drag and drop files here or click to browse</p>
      <Button
        onClick={() => {
          fileInputRef.current?.click();
        }}
        variant="outline"
      >
        <Plus className="h-4 w-4 mr-2" />
        Choose Files
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFileUpload(e.target.files, type);
          }
        }}
      />
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Media Center</h1>
          <p className="text-muted-foreground">Manage your music, videos, and streaming content</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Now Playing Bar */}
      {currentMedia && (
        <Card className="p-4 bg-accent/20 border-accent">
          <div className="space-y-4">
            {/* Media Controls */}
            <div className="flex items-center gap-4">
              <Button size="sm" variant="ghost" onClick={() => handlePlay(currentMedia)} disabled={isPlaying}>
                <Play className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handlePause} disabled={!isPlaying}>
                <Pause className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleStop}>
                <Square className="h-4 w-4" />
              </Button>
              
              {/* Progress Bar */}
              <div className="flex-1 mx-4">
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={1}
                  onValueChange={handleSeekChange}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
                  <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
                </div>
              </div>
              
              {/* Volume */}
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={toggleMute}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Slider
                  value={[volume]}
                  max={100}
                  step={1}
                  onValueChange={handleVolumeChange}
                  className="w-20"
                />
                <span className="text-xs text-muted-foreground w-8">{volume}%</span>
              </div>
            </div>
            
            {/* Media Info */}
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {currentMedia.type === 'video' ? (
                  // For videos, show a small preview or thumbnail
                  <img src={currentMedia.thumbnail || ''} alt="" className="w-16 h-12 object-cover rounded" />
                ) : (
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                    <Music className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{currentMedia.name}</p>
                {currentMedia.artist && <p className="text-sm text-muted-foreground">{currentMedia.artist}</p>}
              </div>
            </div>
            
            {/* Video Preview - Show inline for videos */}
            {currentMedia && currentMedia.type.startsWith('video/') && (
              <div className="mt-4">
                <video
                  ref={videoRef}
                  className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                  controls
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => {
                    setIsPlaying(false);
                    // Optionally auto-next if playlist
                  }}
                />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search media..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="music" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            Music
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="network" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Network
          </TabsTrigger>
          <TabsTrigger value="online" className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Online
          </TabsTrigger>
          <TabsTrigger value="youtube" className="flex items-center gap-2">
            <Youtube className="h-4 w-4" />
            YouTube
          </TabsTrigger>
        </TabsList>

        {/* Music Tab */}
        <TabsContent value="music" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button onClick={() => {
                if (filteredMusicFiles.length > 0) {
                  handlePlay(filteredMusicFiles[0]);
                }
              }}>
                <Play className="h-4 w-4 mr-2" />
                Play All
              </Button>
              <Button variant="outline">
                <Shuffle className="h-4 w-4 mr-2" />
                Shuffle
              </Button>
            </div>
            <Badge variant="secondary">
              {filteredMusicFiles.length} tracks
            </Badge>
          </div>

          {filteredMusicFiles.length === 0 ? (
            <UploadArea type="music" accept="audio/*" />
          ) : (
            <>
              <div className={viewMode === "grid" 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
                : "space-y-2"
              }>
                {filteredMusicFiles.map((media) => (
                  <MediaCard
                    key={media.id}
                    media={media}
                    type="music"
                    onPlay={() => handlePlay(media)}
                    onRemove={() => {
                      setMusicFiles(prev => prev.filter(f => f.id !== media.id));
                      toast.success("Track removed");
                    }}
                  />
                ))}
              </div>
              
              <Card className="p-4">
                <UploadArea type="music" accept="audio/*" />
              </Card>
            </>
          )}
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos" className="space-y-6">
          <div className="flex justify-between items-center">
            <Button onClick={() => {
              if (filteredVideoFiles.length > 0) {
                handlePlay(filteredVideoFiles[0]);
              }
            }}>
              <Play className="h-4 w-4 mr-2" />
              Play All
            </Button>
            <Badge variant="secondary">
              {filteredVideoFiles.length} videos
            </Badge>
          </div>

          {filteredVideoFiles.length === 0 ? (
            <UploadArea type="video" accept="video/*" />
          ) : (
            <>
              <div className={viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "space-y-2"
              }>
                {filteredVideoFiles.map((media) => (
                  <MediaCard
                    key={media.id}
                    media={media}
                    type="video"
                    onPlay={() => handlePlay(media)}
                    onRemove={() => {
                      setVideoFiles(prev => prev.filter(f => f.id !== media.id));
                      toast.success("Video removed");
                    }}
                  />
                ))}
              </div>
              
              <Card className="p-4">
                <UploadArea type="video" accept="video/*" />
              </Card>
            </>
          )}
        </TabsContent>

        {/* Network Tab */}
        <TabsContent value="network" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  Network Devices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button className="w-full" variant="outline">
                    <Search className="h-4 w-4 mr-2" />
                    Scan for Devices
                  </Button>
                  
                  {networkDevices.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No network devices found
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {networkDevices.map((device) => (
                        <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Server className="h-4 w-4" />
                            <div>
                              <p className="font-medium">{device.name}</p>
                              <p className="text-sm text-muted-foreground">{device.ip}</p>
                            </div>
                          </div>
                          <Badge variant={device.status === "online" ? "default" : "secondary"}>
                            {device.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Connection Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="network-path">Network Path</Label>
                  <Input
                    id="network-path"
                    placeholder="\\192.168.1.100\media"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Enter username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                  />
                </div>
                <Button className="w-full">
                  Connect
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Online Tab */}
        <TabsContent value="online" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Live Streams & Radio</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Station
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Radio Station</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="station-name">Station Name</Label>
                    <Input
                      id="station-name"
                      placeholder="Enter station name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="station-url">Stream URL</Label>
                    <Input
                      id="station-url"
                      placeholder="http://stream.example.com/radio"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="station-genre">Genre</Label>
                    <Input
                      id="station-genre"
                      placeholder="e.g., Rock, Pop, Classical"
                    />
                  </div>
                  <Button className="w-full">
                    Add Station
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {streamStations.map((station) => (
              <Card key={station.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Radio className="h-8 w-8 text-primary" />
                    <div className="flex-1">
                      <h4 className="font-medium">{station.name}</h4>
                      <p className="text-sm text-muted-foreground">{station.genre}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">{station.quality}</Badge>
                    <Button size="sm">
                      <Play className="h-4 w-4 mr-2" />
                      Play
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {streamStations.length === 0 && (
            <Card className="p-12 text-center">
              <Radio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No radio stations added</h3>
              <p className="text-muted-foreground mb-4">Add your favorite radio stations and live streams</p>
            </Card>
          )}
        </TabsContent>

        {/* YouTube Tab */}
        <TabsContent value="youtube" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">YouTube Channels</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Channel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add YouTube Channel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="channel-url">Channel URL</Label>
                    <Input
                      id="channel-url"
                      placeholder="https://youtube.com/@channelname"
                    />
                  </div>
                  <Button className="w-full">
                    Add Channel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-6">
            {youtubeChannels.map((channel) => (
              <Card key={channel.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Youtube className="h-5 w-5 text-red-500" />
                    {channel.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {channel.videos.map((video) => (
                      <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="relative">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-32 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button size="sm" variant="secondary">
                              <Play className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardContent className="p-3">
                          <h4 className="font-medium text-sm line-clamp-2 mb-1">{video.title}</h4>
                          <p className="text-xs text-muted-foreground">{video.duration}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {youtubeChannels.length === 0 && (
            <Card className="p-12 text-center">
              <Youtube className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-medium mb-2">No YouTube channels added</h3>
              <p className="text-muted-foreground mb-4">Subscribe to your favorite YouTube channels</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Hidden audio only */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
}