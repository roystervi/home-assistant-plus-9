// src/components/CameraCard.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Video, VideoOff, Cctv, MonitorPlay, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import videojs, { type Player } from 'video.js';
import 'video.js/dist/video-js.css';

export interface Camera {
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

interface CameraCardProps {
  camera: Camera;
  onEdit: (camera: Camera) => void;
  onDelete: (camera: Camera) => void;
  onSnapshot: (camera: Camera) => void;
  onRecord: (camera: Camera) => void;
  onTest: (camera: Camera) => void;
  onFullView: (camera: Camera) => void;
}

const getStatusVariant = (status: Camera["status"]) => {
  const variants = {
    online: "default" as const,
    offline: "destructive" as const,
    connecting: "secondary" as const,
  };
  return variants[status];
};

export default function CameraCard({
  camera,
  onEdit,
  onDelete,
  onSnapshot,
  onRecord,
  onTest,
  onFullView,
}: CameraCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [hasError, setHasError] = useState(false);

  const disposePlayer = useCallback(() => {
    if (playerRef.current && !playerRef.current.isDisposed()) {
      try {
        playerRef.current.dispose();
      } catch (error) {
        console.warn('Error disposing player:', error);
      }
    }
    playerRef.current = null;
    setHasError(false);
  }, []);

  useEffect(() => {
    disposePlayer();

    if (camera.status !== "online") {
      return;
    }

    if (!containerRef.current) return;

    // Clear only if no React children
    if (containerRef.current.children.length === 0) {
      containerRef.current.innerHTML = "";
    }

    const video = document.createElement("video-js");
    video.className = "video-js vjs-big-play-centered";
    video.setAttribute("controls", "");
    video.setAttribute("preload", "auto");
    containerRef.current.appendChild(video);

    const player = videojs(video, {
      fluid: true,
      responsive: true,
      aspectRatio: "16:9",
      sources: [{
        src: `/api/stream/${camera.id}`,
        type: "application/x-mpegURL",
      }],
      html5: {
        vhs: {
          overrideNative: !window.MediaSource,
          withCredentials: false,
        },
      },
    });

    player.ready(() => {
      playerRef.current = player;
    });

    player.on('error', () => {
      setHasError(true);
      disposePlayer();
    });

    return () => {
      disposePlayer();
    };
  }, [camera.status, camera.id, disposePlayer]);

  const handleSnapshotClick = () => onSnapshot(camera);
  const handleRecordClick = () => onRecord(camera);
  const handleTestClick = () => onTest(camera);
  const handleEditClick = () => onEdit(camera);
  const handleDeleteClick = () => onDelete(camera);
  const handleFullViewClick = () => onFullView(camera);

  const showOverlay = camera.status !== "online" || hasError;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg leading-tight">{camera.name}</CardTitle>
          <Badge variant={getStatusVariant(camera.status)}>
            {camera.status.charAt(0).toUpperCase() + camera.status.slice(1)}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2 text-xs">
          <Cctv className="h-3 w-3" />
          <span>{camera.connectionType.toUpperCase()}</span>
          {camera.format && <span>• {camera.format}</span>}
          {camera.resolution && <span>• {camera.resolution}</span>}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 p-4 relative">
        <div
          ref={containerRef}
          className="relative aspect-video bg-muted rounded-md overflow-hidden"
          style={{ height: "200px", minHeight: "200px" }}
        />
        {showOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md z-10">
            <div className="text-center p-4">
              {hasError ? (
                <>
                  <VideoOff className="h-8 w-8 mx-auto mb-2 text-destructive" />
                  <p className="text-sm text-destructive">Stream Error</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setHasError(false)} 
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </>
              ) : camera.status === "online" ? (
                <>
                  <MonitorPlay className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
                  <p className="text-sm text-muted-foreground">Loading stream...</p>
                </>
              ) : (
                <>
                  <VideoOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {camera.status === "connecting" ? "Connecting..." : "Offline"}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {camera.lastMotion && (
          <p className="text-xs text-muted-foreground">
            Last motion: <time>{camera.lastMotion}</time>
          </p>
        )}

        <div className="flex flex-wrap gap-1 justify-between">
          <div className="flex flex-wrap gap-1 flex-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSnapshotClick}
              disabled={camera.status !== "online"}
              className="h-8 px-2"
            >
              <Camera className="h-3 w-3 mr-1" />
              Snap
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecordClick}
              disabled={camera.status !== "online"}
              className="h-8 px-2"
            >
              <Video className="h-3 w-3 mr-1" />
              Record
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestClick}
              className="h-8 px-2"
            >
              Test
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditClick}
              className="h-8 px-2"
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteClick}
              className="h-8 px-2"
            >
              Delete
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFullViewClick}
            disabled={camera.status !== "online"}
            className="h-8 px-3"
          >
            <SwitchCamera className="h-3 w-3 mr-1" />
            Full
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}