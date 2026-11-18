import { useState, useEffect, useRef, useCallback } from "react";
import { MusicPlayer as PlayerService } from "../engine/Player";
import { Scanner } from "../library/Scanner";
import { detectMood } from "../services/moodDetector";
import { api, ApiError } from "../services/api";
import { RepeatMode, Track } from "../shared/Models";
import { PlayerControls } from "./PlayerControls";
import { QueuePanel, QueueView } from "./QueuePanel";
import { AllTracksList, BrowseSection } from "./AllTracksList";
import { ParticleCanvas } from "./ParticleCanvas";
import {
  AlbumsIcon,
  ArrowLeftIcon,
  DiscWaveIcon,
  FileMusicIcon,
  FolderIcon,
  GenreIcon,
  GridMenuIcon,
  HeartIcon,
  HistoryIcon,
  HomeIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  TracksIcon,
} from "./Icons";

export function MusicPlayer() {
  const player = useRef(PlayerService.getInstance()).current;

  // ESTADOS
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [activeTracks, setActiveTracks] = useState<Track[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(player.getState().volume);
  const [muted, setMuted] = useState(player.getState().muted);
  const [shuffle, setShuffle] = useState(player.getState().shuffle);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(player.getState().repeatMode);
  const [playbackRate, setPlaybackRate] = useState(player.getState().playbackRate);
  const [queueView, setQueueView] = useState<QueueView>("ahora");
  const [activeSection, setActiveSection] = useState<BrowseSection>("albums");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isErrorToast, setIsErrorToast] = useState(false);
  const [isLocalFallback, setIsLocalFallback] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Estado para edición de metadatos (PATCH /api/tracks/:id)
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editArtist, setEditArtist] = useState("");

  // Control de sesión de reproducción para registrar una sola vez por inicio real
  const playSessionIdRef = useRef<number>(1);
  const registeredSessionKeyRef = useRef<string | null>(null);
  const prevTrackIdRef = useRef<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const currentTrack = activeTracks[currentIndex] ?? null;
  const mood = detectMood(currentTrack?.title ?? "");
  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  const showToast = useCallback((msg: string, isError = false) => {
    setToast(msg);
    setIsErrorToast(isError);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      setIsErrorToast(false);
    }, isError ? 4000 : 2600);
  }, []);

  const syncPlayerState = useCallback(() => {
    const idx = player.getCurrentIndex();
    setCurrentIndex(idx >= 0 ? idx : 0);
    setActiveTracks([...player.getPlaylist()]);
  }, [player]);

  const applyTrackUpdateEverywhere = useCallback(
    (updated: Track) => {
      setAllTracks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
      const updatedQueue = player.updateTrackInQueue(updated);
      setActiveTracks([...updatedQueue]);
      setHistory((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    },
    [player]
  );

  // Cargar catálogo persistido desde el backend al iniciar
  const fetchCatalogFromBackend = useCallback(async () => {
    try {
      const serverTracks = await api.getTracks();
      setIsLocalFallback(false);
      setAllTracks(serverTracks);

      if (serverTracks.length > 0 && player.getPlaylist().length === 0) {
        player.loadPlaylist(serverTracks, 0);
        setActiveTracks([...serverTracks]);
        setCurrentIndex(0);
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.isNetworkError) {
        setIsLocalFallback(true);
        showToast("Modo respaldo local activo (servidor backend no disponible)", true);
      } else {
        showToast(err?.message || "Error al consultar el catálogo del servidor", true);
      }
    }
  }, [player, showToast]);

  useEffect(() => {
    fetchCatalogFromBackend();
  }, [fetchCatalogFromBackend]);

  // Incrementar identificador de sesión cuando cambia la pista activa
  useEffect(() => {
    const currentId = currentTrack?.id ?? null;
    if (currentId !== prevTrackIdRef.current) {
      prevTrackIdRef.current = currentId;
      playSessionIdRef.current += 1;
    }
  }, [currentTrack?.id]);

  const playAt = useCallback(
    (index: number, list?: Track[]) => {
      const targetList = list ? [...list] : [...activeTracks];
      if (targetList.length === 0) return;
      playSessionIdRef.current += 1;
      player.loadPlaylist(targetList, index);
      setActiveTracks(targetList);
      player.play();
      syncPlayerState();
    },
    [player, activeTracks, syncPlayerState]
  );

  const mergeTracksIntoState = useCallback(
    (incoming: Track[], autoPlayFirst = false) => {
      if (incoming.length === 0) return;

      setAllTracks((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const uniqueNew = incoming.filter((t) => !existingIds.has(t.id));
        const merged = [...prev, ...uniqueNew];

        if (player.getPlaylist().length === 0 && merged.length > 0) {
          playSessionIdRef.current += 1;
          player.loadPlaylist(merged, 0);
          setActiveTracks([...merged]);
          setCurrentIndex(0);
          if (autoPlayFirst) {
            player.play();
          }
        } else if (autoPlayFirst && incoming[0]) {
          playSessionIdRef.current += 1;
          const updatedQueue = player.enqueueNext(incoming[0]);
          setActiveTracks([...updatedQueue]);
          player.skipNext();
          syncPlayerState();
        } else if (uniqueNew.length > 0) {
          let updatedQueue = player.getPlaylist();
          for (const t of uniqueNew) {
            updatedQueue = player.enqueue(t);
          }
          setActiveTracks([...updatedQueue]);
        }

        return merged;
      });
    },
    [player, syncPlayerState]
  );

  const processSelectedFiles = useCallback(
    async (files: File[], autoPlayFirst = false) => {
      if (files.length === 0) {
        showToast("No se detectaron archivos de audio compatibles", true);
        return;
      }

      setIsUploading(true);
      try {
        const uploadedTracks = await api.uploadTracks(files);
        setIsLocalFallback(false);
        mergeTracksIntoState(uploadedTracks, autoPlayFirst);
        showToast(
          uploadedTracks.length === 1
            ? `Pista guardada: ${uploadedTracks[0].title}`
            : `${uploadedTracks.length} pistas subidas al servidor`
        );
      } catch (err: any) {
        if (err instanceof ApiError && err.isNetworkError) {
          setIsLocalFallback(true);
          const localTracks = Scanner.createTracksFromFiles(files);
          mergeTracksIntoState(localTracks, autoPlayFirst);
          showToast(
            `Modo respaldo local: ${localTracks.length} pista(s) cargadas sin servidor`,
            true
          );
        } else {
          showToast(err?.message || "Error al subir archivos al servidor", true);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [mergeTracksIntoState, showToast]
  );

  const handleLoadFiles = useCallback(async () => {
    const files = await Scanner.pickFiles();
    if (files.length > 0) {
      await processSelectedFiles(files, files.length === 1);
    }
  }, [processSelectedFiles]);

  const handleLoadFolder = useCallback(async () => {
    const files = await Scanner.pickFolderFiles();
    if (files.length > 0) {
      await processSelectedFiles(files, false);
    } else {
      showToast("No se seleccionaron archivos de la carpeta");
    }
  }, [processSelectedFiles, showToast]);

  const handleNext = useCallback(
    (autoEnded = false) => {
      if (activeTracks.length === 0) return;
      playSessionIdRef.current += 1;
      const next = player.skipNext(autoEnded);
      if (!next && autoEnded) {
        setPlaying(false);
        setProgress(0);
      }
      syncPlayerState();
    },
    [activeTracks.length, player, syncPlayerState]
  );

  const handlePrev = useCallback(() => {
    if (activeTracks.length === 0) return;
    if (player.getAudio().currentTime > 3) {
      player.getAudio().currentTime = 0;
      setProgress(0);
      if (currentTrack && !currentTrack.isLocalFallback && !isLocalFallback) {
        api
          .recordPlaybackEvent({
            trackId: currentTrack.id,
            eventType: "seek",
            positionSeconds: 0,
          })
          .catch(() => {});
      }
    } else {
      playSessionIdRef.current += 1;
      player.skipPrev();
      syncPlayerState();
    }
  }, [activeTracks.length, currentTrack, isLocalFallback, player, syncPlayerState]);

  const handlePlaySelected = () => {
    const toPlay = allTracks.filter((t) => selectedIds.includes(t.id));
    if (toPlay.length > 0) {
      playAt(0, toPlay);
      setSelectedIds([]);
      showToast(`Reproduciendo selección (${toPlay.length} pistas)`);
    }
  };

  const handleEnqueueSelected = () => {
    const toAdd = allTracks.filter((t) => selectedIds.includes(t.id));
    if (toAdd.length === 0) return;
    let updated: Track[] = [];
    toAdd.forEach((t) => {
      updated = player.enqueue(t);
    });
    setActiveTracks([...updated]);
    setSelectedIds([]);
    showToast(`${toAdd.length} pistas añadidas a la cola`);
  };

  const handleReorder = (draggedIndex: number, targetIndex: number) => {
    const updated = player.reorderQueue(draggedIndex, targetIndex);
    setActiveTracks([...updated]);
    setCurrentIndex(player.getCurrentIndex());
  };

  const handleRemoveFromQueue = (index: number) => {
    const { tracks, newIndex } = player.removeFromQueue(index);
    setActiveTracks([...tracks]);
    setCurrentIndex(newIndex);
    if (tracks.length === 0) {
      setPlaying(false);
      setProgress(0);
      setDuration(0);
    }
  };

  const handleClearQueue = () => {
    const updated = player.clearQueueKeepCurrent();
    setActiveTracks([...updated]);
    setCurrentIndex(Math.max(0, player.getCurrentIndex()));
    showToast("Cola de próximas pistas limpiada");
  };

  const handleRemoveFromLibrary = async (index: number) => {
    const targetList =
      activeSection === "recent" && history.length > 0 ? history : allTracks;
    const trackToRemove = targetList[index];
    if (!trackToRemove) return;

    if (!trackToRemove.isLocalFallback && !isLocalFallback) {
      try {
        await api.deleteTrack(trackToRemove.id);
      } catch (err: any) {
        if (err instanceof ApiError && err.statusCode !== 404) {
          showToast(err.message || "Error al eliminar la pista del servidor", true);
          return;
        }
      }
    }

    setAllTracks((prev) => prev.filter((t) => t.id !== trackToRemove.id));
    setHistory((prev) => prev.filter((t) => t.id !== trackToRemove.id));
    setSelectedIds((prev) => prev.filter((id) => id !== trackToRemove.id));

    const queueIdx = activeTracks.findIndex((t) => t.id === trackToRemove.id);
    if (queueIdx !== -1) {
      handleRemoveFromQueue(queueIdx);
    }
    showToast(`Eliminada: ${trackToRemove.title}`);
  };

  const handleToggleFavorite = async (id: string) => {
    const target =
      allTracks.find((t) => t.id === id) || activeTracks.find((t) => t.id === id);
    if (!target) return;

    const nextFav = !target.favorite;
    const optimisticTrack: Track = { ...target, favorite: nextFav };
    applyTrackUpdateEverywhere(optimisticTrack);

    if (!target.isLocalFallback && !isLocalFallback) {
      try {
        const updatedFromServer = await api.updateTrack(id, { favorite: nextFav });
        applyTrackUpdateEverywhere(updatedFromServer);
      } catch (err: any) {
        applyTrackUpdateEverywhere(target);
        showToast(err?.message || "No se pudo actualizar favorito en el servidor", true);
      }
    }
  };

  const handleOpenEditTrack = (track: Track) => {
    setEditingTrack(track);
    setEditTitle(track.title);
    setEditArtist(track.artist || "");
  };

  const handleSaveEditTrack = async () => {
    if (!editingTrack) return;
    const trimmedTitle = editTitle.trim();
    const trimmedArtist = editArtist.trim() || "Biblioteca Local";

    if (!trimmedTitle) {
      showToast("El título no puede estar vacío", true);
      return;
    }

    if (!editingTrack.isLocalFallback && !isLocalFallback) {
      try {
        const updated = await api.updateTrack(editingTrack.id, {
          title: trimmedTitle,
          artist: trimmedArtist,
        });
        applyTrackUpdateEverywhere(updated);
        setEditingTrack(null);
        showToast(`Actualizada: ${updated.title}`);
      } catch (err: any) {
        showToast(err?.message || "Error al actualizar la pista en el servidor", true);
      }
    } else {
      const updatedLocal: Track = {
        ...editingTrack,
        title: trimmedTitle,
        artist: trimmedArtist,
      };
      applyTrackUpdateEverywhere(updatedLocal);
      setEditingTrack(null);
      showToast(`Actualizada localmente: ${updatedLocal.title}`);
    }
  };

  const handleEnqueueTrack = (track: Track) => {
    const wasEmpty = activeTracks.length === 0;
    const updated = player.enqueue(track);
    setActiveTracks([...updated]);
    if (wasEmpty) {
      playSessionIdRef.current += 1;
      setCurrentIndex(0);
      player.play();
    }
    showToast(`Añadida a la cola: ${track.title}`);
  };

  const handlePlayNextTrack = (track: Track) => {
    const wasEmpty = activeTracks.length === 0;
    const updated = player.enqueueNext(track);
    setActiveTracks([...updated]);
    if (wasEmpty) {
      playSessionIdRef.current += 1;
      setCurrentIndex(0);
      player.play();
    }
    showToast(`Sonará a continuación: ${track.title}`);
  };

  const handlePlayHistoryTrack = (track: Track) => {
    const idxInActive = activeTracks.findIndex((t) => t.id === track.id);
    if (idxInActive !== -1) {
      playAt(idxInActive);
    } else {
      playSessionIdRef.current += 1;
      const updated = player.enqueueNext(track);
      setActiveTracks([...updated]);
      player.skipNext();
      syncPlayerState();
    }
  };

  const handleShufflePlayAll = () => {
    if (allTracks.length === 0) {
      handleLoadFiles();
      return;
    }
    if (!shuffle) {
      setShuffle(player.toggleShuffle());
    }
    const randomIdx = Math.floor(Math.random() * allTracks.length);
    playAt(randomIdx, allTracks);
    showToast("Shuffle Play activado");
  };

  // --- REGISTRO DE REPRODUCCIÓN (UNA SOLA VEZ POR INICIO REAL) E HISTORIAL ---
  useEffect(() => {
    if (!currentTrack || !playing) return;
    const sessionKey = `${currentTrack.id}:${playSessionIdRef.current}`;

    if (progress > 0.15 && registeredSessionKeyRef.current !== sessionKey) {
      registeredSessionKeyRef.current = sessionKey;

      setHistory((prev) => {
        const filtered = prev.filter((t) => t.id !== currentTrack.id);
        return [currentTrack, ...filtered].slice(0, 50);
      });

      if (!currentTrack.isLocalFallback && !isLocalFallback) {
        api
          .registerPlay(currentTrack.id, progress)
          .then((updatedTrack) => {
            applyTrackUpdateEverywhere(updatedTrack);
          })
          .catch(() => {
            // Silently ignore if backend momentarily disconnects mid-stream
          });
      }
    }
  }, [progress, currentTrack, playing, isLocalFallback, applyTrackUpdateEverywhere]);

  // --- EVENTOS DE AUDIO ---
  useEffect(() => {
    const audio = player.getAudio();
    const onTime = () => setProgress(audio.currentTime);
    const onDuration = () => setDuration(audio.duration || 0);
    const onPlay = () => {
      setPlaying(true);
      syncPlayerState();
    };
    const onPause = () => {
      setPlaying(false);
      const track = player.getCurrentTrack();
      if (track && !track.isLocalFallback && !isLocalFallback && !audio.ended) {
        api
          .recordPlaybackEvent({
            trackId: track.id,
            eventType: "pause",
            positionSeconds: audio.currentTime || 0,
          })
          .catch(() => {});
      }
    };
    const onEnded = () => {
      const track = player.getCurrentTrack();
      if (track && !track.isLocalFallback && !isLocalFallback) {
        api
          .recordPlaybackEvent({
            trackId: track.id,
            eventType: "ended",
            positionSeconds: audio.duration || audio.currentTime || 0,
          })
          .catch(() => {});
      }
      handleNext(true);
    };
    const onError = () => {
      const track = player.getCurrentTrack();
      if (track) {
        showToast(`Error al transmitir audio: ${track.title}`, true);
      }
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [player, syncPlayerState, handleNext, isLocalFallback, showToast]);

  // --- ATAJOS DE TECLADO ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        player.togglePlay();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        const audio = player.getAudio();
        if (audio.duration) {
          audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
        }
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        const audio = player.getAudio();
        audio.currentTime = Math.max(0, audio.currentTime - 5);
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        const nextVol = Math.min(1, volume + 0.05);
        player.setVolume(nextVol);
        setVolume(nextVol);
        setMuted(false);
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        const nextVol = Math.max(0, volume - 0.05);
        player.setVolume(nextVol);
        setVolume(nextVol);
      } else if (e.key.toLowerCase() === "m") {
        setMuted(player.toggleMute());
      } else if (e.key.toLowerCase() === "n") {
        handleNext(false);
      } else if (e.key.toLowerCase() === "p") {
        handlePrev();
      } else if (e.key.toLowerCase() === "s") {
        const s = player.toggleShuffle();
        setShuffle(s);
        showToast(s ? "Modo aleatorio activado" : "Modo aleatorio desactivado");
      } else if (e.key.toLowerCase() === "r") {
        const r = player.cycleRepeatMode();
        setRepeatMode(r);
        showToast(
          r === "off"
            ? "Repetición desactivada"
            : r === "all"
            ? "Repetir toda la cola"
            : "Repetir pista actual"
        );
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [player, volume, handleNext, handlePrev, showToast]);

  const displayedTracks =
    activeSection === "recent" && history.length > 0 ? history : allTracks;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes("Files")) {
          setIsDraggingFiles(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) {
          setIsDraggingFiles(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFiles(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const validFiles = Scanner.filterMusicFiles(e.dataTransfer.files);
          if (validFiles.length > 0) {
            processSelectedFiles(validFiles, true);
          } else {
            showToast("No se detectaron archivos de audio compatibles", true);
          }
        }
      }}
      style={{
        width: "100vw",
        height: "100vh",
        background: "#07050c",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* SLOWLY COLOR-SHIFTING AMBIENT BACKGROUND CANVAS */}
      <ParticleCanvas mood={mood} playing={playing} />

      {/* MAIN FROSTED GLASS APP SHELL OVER THE SHIFTING AURORA */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: "16px",
          gap: "16px",
          background: "rgba(10, 8, 18, 0.28)",
        }}
      >
        {/* OVERLAY DRAG & DROP */}
        {isDraggingFiles && (
          <div
            style={{
              position: "absolute",
              inset: "20px",
              borderRadius: "32px",
              border: "2px dashed #1ED760",
              background: "rgba(12, 10, 22, 0.78)",
              backdropFilter: "blur(28px)",
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <DiscWaveIcon size={54} color="#1ED760" />
            <p style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff", marginTop: "14px" }}>
              Suelta tus archivos de audio aquí
            </p>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginTop: "6px" }}>
              MP3, WAV, FLAC, OGG, AAC, M4A, OPUS, WEBM
            </p>
          </div>
        )}

        {/* MODAL DE EDICIÓN DE METADATOS (PATCH /api/tracks/:id) */}
        {editingTrack && (
          <div
            onClick={() => setEditingTrack(null)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(6, 5, 12, 0.65)",
              backdropFilter: "blur(16px)",
              zIndex: 90,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "400px",
                padding: "28px",
                borderRadius: "26px",
                background: "rgba(22, 18, 36, 0.92)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 800, color: "#ffffff" }}>
                Editar metadatos de pista
              </h3>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.65)",
                    marginBottom: "6px",
                  }}
                >
                  Título
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 600,
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.65)",
                    marginBottom: "6px",
                  }}
                >
                  Artista
                </label>
                <input
                  type="text"
                  value={editArtist}
                  onChange={(e) => setEditArtist(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 600,
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                <button
                  onClick={() => setEditingTrack(null)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#ffffff",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEditTrack}
                  style={{
                    padding: "9px 22px",
                    borderRadius: "999px",
                    background: "#1ED760",
                    border: "none",
                    color: "#041f11",
                    fontSize: "13.5px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOAST NOTIFICATION */}
        {toast && (
          <div
            style={{
              position: "absolute",
              bottom: "112px",
              left: "50%",
              transform: "translateX(-50%)",
              background: isErrorToast
                ? "rgba(220, 38, 38, 0.22)"
                : "rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(24px) saturate(190%)",
              border: isErrorToast
                ? "1px solid rgba(248, 113, 113, 0.55)"
                : "1px solid rgba(255, 255, 255, 0.24)",
              color: "#ffffff",
              padding: "10px 22px",
              borderRadius: "999px",
              fontSize: "14px",
              fontWeight: 700,
              zIndex: 60,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 12px 34px rgba(0,0,0,0.45)",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: isErrorToast ? "#F87171" : "#1ED760",
                boxShadow: isErrorToast ? "0 0 10px #F87171" : "0 0 10px #1ED760",
              }}
            />
            <span>{toast}</span>
          </div>
        )}

        {/* TOP NAVIGATION BAR */}
        <nav
          style={{
            height: "82px",
            padding: "0 30px",
            borderRadius: "26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            userSelect: "none",
            background: "rgba(255, 255, 255, 0.055)",
            backdropFilter: "blur(36px) saturate(185%)",
            WebkitBackdropFilter: "blur(36px) saturate(185%)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
            boxShadow: "0 14px 36px rgba(0, 0, 0, 0.32), inset 0 1px 1px rgba(255, 255, 255, 0.22)",
          }}
        >
          {/* Left: Brand + Search Input */}
          <div style={{ display: "flex", alignItems: "center", gap: "36px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #1ED760, #0FA36B)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 18px rgba(30, 215, 96, 0.45)",
                }}
              >
                <DiscWaveIcon size={20} color="#041f11" />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "22px",
                  fontWeight: 900,
                  color: "#ffffff",
                  letterSpacing: "-0.3px",
                }}
              >
                NeonBeat
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <button
                onClick={handlePrev}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "50%",
                  width: "34px",
                  height: "34px",
                  color: "rgba(255,255,255,0.75)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowLeftIcon size={16} />
              </button>

              {/* Inline Translucent Glass Search Box */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "rgba(255, 255, 255, 0.07)",
                  backdropFilter: "blur(18px)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "999px",
                  padding: "8px 18px",
                  width: "280px",
                }}
              >
                <SearchIcon size={16} color="rgba(255,255,255,0.6)" />
                <input
                  type="text"
                  placeholder="Buscar canciones, artistas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 600,
                    outline: "none",
                    width: "100%",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Center: Top Navigation Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            <button
              onClick={() => setActiveSection("albums")}
              style={{
                background: "none",
                border: "none",
                color: activeSection === "albums" ? "#ffffff" : "rgba(255,255,255,0.5)",
                fontSize: "15px",
                fontWeight: activeSection === "albums" ? 800 : 600,
                cursor: "pointer",
              }}
            >
              New Releases
            </button>

            <button
              onClick={() => setActiveSection("tracks")}
              style={{
                background: "none",
                border: "none",
                color: activeSection === "tracks" ? "#ffffff" : "rgba(255,255,255,0.5)",
                fontSize: "15px",
                fontWeight: activeSection === "tracks" ? 800 : 600,
                cursor: "pointer",
              }}
            >
              Tracks Feed
            </button>

            <button
              onClick={handleShufflePlayAll}
              style={{
                background: "none",
                border: "none",
                color: shuffle ? "#1ED760" : "rgba(255,255,255,0.5)",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Shuffle Play
            </button>
          </div>

          {/* Right: File Actions & User Profile Pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {isLocalFallback && (
              <button
                onClick={fetchCatalogFromBackend}
                title="Sin conexión al backend. Haz clic para reintentar conexión al servidor."
                style={{
                  background: "rgba(245, 158, 11, 0.18)",
                  border: "1px solid rgba(245, 158, 11, 0.5)",
                  borderRadius: "999px",
                  color: "#FBBF24",
                  padding: "6px 14px",
                  fontSize: "12.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "#FBBF24",
                  }}
                />
                <span>Modo Local</span>
              </button>
            )}

            {selectedIds.length > 0 && (
              <>
                <button
                  onClick={handlePlaySelected}
                  style={{
                    background: "#1ED760",
                    border: "none",
                    borderRadius: "999px",
                    color: "#041f11",
                    padding: "9px 18px",
                    fontSize: "13.5px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 6px 20px rgba(30, 215, 96, 0.35)",
                  }}
                >
                  <PlayIcon size={13} color="#041f11" />
                  <span>Reproducir ({selectedIds.length})</span>
                </button>
                <button
                  onClick={handleEnqueueSelected}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: "999px",
                    color: "#ffffff",
                    padding: "9px 16px",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <PlusIcon size={13} />
                  <span>Cola</span>
                </button>
              </>
            )}

            <button
              onClick={handleLoadFolder}
              disabled={isUploading}
              title="Cargar carpeta de música"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                borderRadius: "999px",
                color: "#ffffff",
                padding: "9px 18px",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: isUploading ? "wait" : "pointer",
                opacity: isUploading ? 0.65 : 1,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FolderIcon size={16} color="#1ED760" />
              <span>Carpeta</span>
            </button>

            <button
              onClick={handleLoadFiles}
              disabled={isUploading}
              title="Seleccionar archivos de audio"
              style={{
                background: "rgba(30, 215, 96, 0.18)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(30, 215, 96, 0.45)",
                borderRadius: "999px",
                color: "#ffffff",
                padding: "9px 18px",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: isUploading ? "wait" : "pointer",
                opacity: isUploading ? 0.65 : 1,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FileMusicIcon size={16} color="#1ED760" />
              <span>{isUploading ? "Subiendo..." : "Archivos"}</span>
            </button>

            <div
              title={
                isLocalFallback
                  ? "Modo de respaldo local (sin conexión al backend)"
                  : "Conectado al servidor backend (persistencia SQLite activa)"
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginLeft: "6px",
                background: "rgba(255, 255, 255, 0.07)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                padding: "5px 14px 5px 6px",
                borderRadius: "999px",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: isLocalFallback
                    ? "linear-gradient(135deg, #F59E0B, #EA580C)"
                    : "linear-gradient(135deg, #1ED760, #6C8EFF)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "#05140c",
                }}
              >
                N
              </div>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#ffffff" }}>
                {allTracks.length} Pistas
              </span>
              <GridMenuIcon size={15} color="rgba(255,255,255,0.6)" />
            </div>
          </div>
        </nav>

        {/* MAIN 3-COLUMN BODY */}
        <div style={{ display: "flex", flex: 1, gap: "16px", overflow: "hidden" }}>
          {/* LEFT SIDEBAR: Rounded Translucent Glass Island */}
          <aside
            style={{
              width: "260px",
              padding: "22px 16px 22px 16px",
              borderRadius: "28px",
              display: "flex",
              flexDirection: "column",
              gap: "28px",
              flexShrink: 0,
              userSelect: "none",
              background: "rgba(255, 255, 255, 0.055)",
              backdropFilter: "blur(36px) saturate(185%)",
              WebkitBackdropFilter: "blur(36px) saturate(185%)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              boxShadow: "0 18px 42px rgba(0, 0, 0, 0.32), inset 0 1px 1px rgba(255, 255, 255, 0.22)",
            }}
          >
            {/* Main Menu */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {(
                [
                  { id: "home", label: "Home", icon: <HomeIcon size={18} /> },
                  { id: "genres", label: "Browse", icon: <AlbumsIcon size={18} /> },
                  { id: "radio", label: "Radio", icon: <GenreIcon size={18} /> },
                ] as { id: BrowseSection; label: string; icon: JSX.Element }[]
              ).map((item) => {
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === "radio") {
                        handleShufflePlayAll();
                      } else {
                        setActiveSection(item.id);
                      }
                    }}
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      width: "100%",
                      padding: "11px 18px",
                      borderRadius: "16px",
                      border: active ? "1px solid rgba(30, 215, 96, 0.35)" : "1px solid transparent",
                      background: active ? "rgba(255, 255, 255, 0.09)" : "transparent",
                      color: active ? "#1ED760" : "rgba(255, 255, 255, 0.68)",
                      fontSize: "15px",
                      fontWeight: active ? 800 : 600,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {active && (
                      <span
                        style={{
                          position: "absolute",
                          left: "4px",
                          top: "9px",
                          bottom: "9px",
                          width: "4px",
                          borderRadius: "999px",
                          background: "#1ED760",
                          boxShadow: "0 0 12px #1ED760",
                        }}
                      />
                    )}
                    <span style={{ display: "flex", alignItems: "center" }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* LIBRARY SECTION */}
            <div>
              <p
                style={{
                  fontSize: "11.5px",
                  fontWeight: 800,
                  letterSpacing: "1.6px",
                  textTransform: "uppercase",
                  color: "rgba(255, 255, 255, 0.48)",
                  margin: "0 0 12px 14px",
                }}
              >
                Library
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {(
                  [
                    { id: "tracks", label: "All Tracks", icon: <TracksIcon size={17} /> },
                    { id: "recent", label: "Recently Played", icon: <HistoryIcon size={17} /> },
                    { id: "favorites", label: "Favorite Songs", icon: <HeartIcon size={17} /> },
                    { id: "albums", label: "Albums Grid", icon: <AlbumsIcon size={17} /> },
                  ] as { id: BrowseSection; label: string; icon: JSX.Element }[]
                ).map((item) => {
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.label}
                      onClick={() => setActiveSection(item.id)}
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        width: "100%",
                        padding: "10px 18px",
                        borderRadius: "16px",
                        border: active ? "1px solid rgba(30, 215, 96, 0.35)" : "1px solid transparent",
                        background: active ? "rgba(255,255,255,0.09)" : "transparent",
                        color: active ? "#1ED760" : "rgba(255, 255, 255, 0.65)",
                        fontSize: "14.5px",
                        fontWeight: active ? 800 : 600,
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.18s ease",
                      }}
                    >
                      {active && (
                        <span
                          style={{
                            position: "absolute",
                            left: "4px",
                            top: "8px",
                            bottom: "8px",
                            width: "4px",
                            borderRadius: "999px",
                            background: "#1ED760",
                            boxShadow: "0 0 12px #1ED760",
                          }}
                        />
                      )}
                      <span style={{ display: "flex", alignItems: "center", opacity: 0.85 }}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QUICK ADD PLAYLIST BUTTON AT BOTTOM OF SIDEBAR */}
            <div style={{ marginTop: "auto" }}>
              <button
                onClick={handleLoadFiles}
                disabled={isUploading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  borderRadius: "16px",
                  padding: "12px 18px",
                  width: "100%",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: isUploading ? "wait" : "pointer",
                }}
              >
                <PlusIcon size={16} color="#1ED760" />
                <span>{isUploading ? "Subiendo..." : "Añadir Canciones"}</span>
              </button>
            </div>
          </aside>

          {/* CENTER CONTENT: Rounded Glass Panel */}
          <main
            style={{
              flex: 1,
              borderRadius: "28px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              background: "rgba(255, 255, 255, 0.04)",
              backdropFilter: "blur(32px) saturate(180%)",
              WebkitBackdropFilter: "blur(32px) saturate(180%)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 18px 42px rgba(0, 0, 0, 0.28), inset 0 1px 1px rgba(255, 255, 255, 0.18)",
            }}
          >
            <AllTracksList
              tracks={displayedTracks}
              currentTrackId={currentTrack?.id ?? null}
              currentIndex={activeTracks === displayedTracks ? currentIndex : -1}
              playing={playing}
              mood={mood}
              searchQuery={searchQuery}
              activeSection={activeSection}
              onPlayAt={(i) => playAt(i, displayedTracks)}
              onRemoveTrack={handleRemoveFromLibrary}
              selectedIds={selectedIds}
              onToggleSelect={(id) =>
                setSelectedIds((prev) =>
                  prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                )
              }
              onSelectAll={(ids) => setSelectedIds(ids)}
              onEnqueueTrack={handleEnqueueTrack}
              onPlayNextTrack={handlePlayNextTrack}
              onToggleFavorite={handleToggleFavorite}
              onEditTrack={handleOpenEditTrack}
              onRequestLoadFiles={handleLoadFiles}
              onRequestLoadFolder={handleLoadFolder}
              onTogglePlay={() => player.togglePlay()}
            />
          </main>

          {/* RIGHT SIDEBAR: Rounded Frosted Glass Island */}
          <aside
            style={{
              width: "375px",
              borderRadius: "28px",
              flexShrink: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              background: "rgba(255, 255, 255, 0.055)",
              backdropFilter: "blur(36px) saturate(185%)",
              WebkitBackdropFilter: "blur(36px) saturate(185%)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              boxShadow: "0 18px 42px rgba(0, 0, 0, 0.32), inset 0 1px 1px rgba(255, 255, 255, 0.22)",
            }}
          >
            <QueuePanel
              tracks={activeTracks}
              history={history}
              currentIndex={currentIndex}
              playing={playing}
              progress={progress}
              duration={duration}
              pct={pct}
              mood={mood}
              view={queueView}
              onSetView={setQueueView}
              onPlayAt={(i) => playAt(i)}
              onRemoveTrack={handleRemoveFromQueue}
              onReorder={handleReorder}
              onClearQueue={handleClearQueue}
              onPlayHistoryTrack={handlePlayHistoryTrack}
              onClearHistory={() => setHistory([])}
              onTogglePlay={() => player.togglePlay()}
              onToggleFavorite={handleToggleFavorite}
            />
          </aside>
        </div>

        {/* BOTTOM FLOATING GLASS PLAYER BAR */}
        <PlayerControls
          mood={mood}
          playing={playing}
          currentTrack={currentTrack}
          currentIndex={currentIndex}
          pct={pct}
          progress={progress}
          duration={duration}
          volume={volume}
          muted={muted}
          shuffle={shuffle}
          repeatMode={repeatMode}
          playbackRate={playbackRate}
          onToggle={() => player.togglePlay()}
          onPrev={handlePrev}
          onNext={() => handleNext(false)}
          onSeek={(t) => {
            player.getAudio().currentTime = t;
            setProgress(t);
            if (currentTrack && !currentTrack.isLocalFallback && !isLocalFallback) {
              api
                .recordPlaybackEvent({
                  trackId: currentTrack.id,
                  eventType: "seek",
                  positionSeconds: t,
                })
                .catch(() => {});
            }
          }}
          onVolumeChange={(v) => {
            player.setVolume(v);
            setVolume(v);
            setMuted(v === 0);
          }}
          onToggleMute={() => setMuted(player.toggleMute())}
          onToggleShuffle={() => {
            const s = player.toggleShuffle();
            setShuffle(s);
            showToast(s ? "Modo aleatorio activado" : "Modo aleatorio desactivado");
          }}
          onCycleRepeat={() => {
            const r = player.cycleRepeatMode();
            setRepeatMode(r);
            showToast(
              r === "off"
                ? "Repetición desactivada"
                : r === "all"
                ? "Repetir toda la cola"
                : "Repetir pista actual"
            );
          }}
          onPlaybackRateChange={(rate) => {
            player.setPlaybackRate(rate);
            setPlaybackRate(rate);
            showToast(`Velocidad: ${rate}x`);
          }}
          onToggleFavorite={handleToggleFavorite}
        />
      </div>
    </div>
  );
}
