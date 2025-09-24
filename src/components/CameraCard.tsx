// src/components/CameraCard.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Video, VideoOff, Cctv, MonitorPlay, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Use direct camera URL for HTTP/MJPEG, mock for others
  const streamSrc = camera.connectionType === "http" 
    ? camera.url  // Direct MJPEG URL with auth
    : `/api/stream/${camera.id}`; // Mock for RTSP/etc.

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);

    if (camera.connectionType === "http" && imgRef.current) {
      const img = imgRef.current;
      img.onload = () => {
        setIsLoading(false);
        setHasError(false);
      };
      img.onerror = () => {
        setHasError(true);
        setIsLoading(false);
      };
      // Trigger load
      img.src = streamSrc;
    } else {
      const video = videoRef.current;
      if (video) {
        const handleError = () => {
          setHasError(true);
          setIsLoading(false);
        };

        const handleLoadStart = () => {
          setIsLoading(true);
          setHasError(false);
        };

        const handleCanPlay = () => {
          setIsLoading(false);
        };

        video.addEventListener('error', handleError);
        video.addEventListener('loadstart', handleLoadStart);
        video.addEventListener('canplay', handleCanPlay);

        // For non-HTTP, simulate if no real stream
        if (camera.status === "online") {
          const timeout = setTimeout(() => {
            if (video.networkState === 0 || video.readyState === 0) {
              setHasError(true);
              setIsLoading(false);
            }
          }, 3000);

          return () => {
            clearTimeout(timeout);
            video.removeEventListener('error', handleError);
            video.removeEventListener('loadstart', handleLoadStart);
            video.removeEventListener('canplay', handleCanPlay);
          };
        }

        return () => {
          video.removeEventListener('error', handleError);
          video.removeEventListener('loadstart', handleLoadStart);
          video.removeEventListener('canplay', handleCanPlay);
        };
      }
    }
  }, [camera.connectionType, camera.url, camera.status, camera.id, streamSrc]);

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    // Re-trigger src
    if (camera.connectionType === "http" && imgRef.current) {
      imgRef.current.src = streamSrc + '?t=' + Date.now();
    } else if (videoRef.current) {
      videoRef.current.load();
    }
  };

  const handleSnapshotClick = () => onSnapshot(camera);
  const handleRecordClick = () => onRecord(camera);
  const handleTestClick = () => onTest(camera);
  const handleEditClick = () => onEdit(camera);
  const handleDeleteClick = () => onDelete(camera);
  const handleFullViewClick = () => onFullView(camera);

  const showOverlay = (camera.status !== "online" && !isLoading) || hasError;

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
        <div className="relative aspect-video bg-muted rounded-md overflow-hidden" style={{ height: "200px", minHeight: "200px" }}>
          {camera.connectionType === "http" ? (
            <img
              ref={imgRef}
              src={streamSrc}
              alt={`${camera.name} live stream`}
              className={`w-full h-full object-cover rounded-md transition-opacity ${isLoading || hasError ? 'opacity-0' : 'opacity-100'}`}
            />
          ) : (
            <video
              ref={videoRef}
              src={streamSrc}
              className={`w-full h-full object-cover rounded-md transition-opacity ${isLoading || hasError ? 'opacity-0' : 'opacity-100'}`}
              autoPlay
              muted
              loop
              playsInline
              controls={false}
            />
          )}
          {(isLoading || showOverlay) && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md z-10">
              <div className="text-center p-4">
                {hasError ? (
                  <>
                    <VideoOff className="h-8 w-8 mx-auto mb-2 text-destructive" />
                    <p className="text-sm text-destructive">Stream Error (check auth/network)</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRetry} 
                      className="mt-2"
                    >
                      Retry
                    </Button>
                  </>
                ) : isLoading ? (
                  <>
                    <MonitorPlay className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
                    <p className="text-sm text-muted-foreground">Loading stream...</p>
                  </>
                ) : camera.status === "connecting" ? (
                  <>
                    <VideoOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Connecting...</p>
                  </>
                ) : (
                  <>
                    <VideoOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Offline</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

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
              disabled={camera.status !== "online" || hasError}
              className="h-8 px-2"
            >
              <Camera className="h-3 w-3 mr-1" />
              Snap
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecordClick}
              disabled={camera.status !== "online" || hasError}
              className="h-8 px-2"
            >
              <Video className="h-3 w-3 mr-1" />
              Record
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestClick}
              disabled={hasError}
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
            disabled={camera.status !== "online" || hasError}
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