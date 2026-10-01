import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Move, UploadCloud } from 'lucide-react';

interface BoardImage {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDragging?: boolean;
}

interface WindowGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScreenshotBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'a29_screenshot_board_geometry_v1';

export const ScreenshotBoardModal: React.FC<ScreenshotBoardModalProps> = ({ isOpen, onClose }) => {
  const [images, setImages] = useState<BoardImage[]>([]);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const [isResizingWindow, setIsResizingWindow] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);

  // Default geometry: centered
  const [geometry, setGeometry] = useState<WindowGeometry>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.width && parsed.height && parsed.x !== undefined && parsed.y !== undefined) {
          // Boundary checks to ensure it doesn't open off-screen
          const maxX = Math.max(0, window.innerWidth - 100);
          const maxY = Math.max(0, window.innerHeight - 100);
          return {
            x: Math.min(Math.max(10, parsed.x), maxX),
            y: Math.min(Math.max(10, parsed.y), maxY),
            width: Math.min(Math.max(380, parsed.width), window.innerWidth - 20),
            height: Math.min(Math.max(260, parsed.height), window.innerHeight - 20),
          };
        }
      }
    } catch {
      // fallback to default
    }
    const defaultW = Math.min(840, window.innerWidth - 40);
    const defaultH = Math.min(560, window.innerHeight - 60);
    return {
      x: Math.max(20, Math.floor((window.innerWidth - defaultW) / 2)),
      y: Math.max(20, Math.floor((window.innerHeight - defaultH) / 2)),
      width: defaultW,
      height: defaultH,
    };
  });

  const windowRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const startDragRef = useRef<{ mouseX: number; mouseY: number; initialX: number; initialY: number; initialW: number; initialH: number }>({
    mouseX: 0,
    mouseY: 0,
    initialX: 0,
    initialY: 0,
    initialW: 0,
    initialH: 0,
  });

  const panStartRef = useRef<{ mouseX: number; mouseY: number; initialPanX: number; initialPanY: number }>({
    mouseX: 0,
    mouseY: 0,
    initialPanX: 0,
    initialPanY: 0,
  });

  const imageDragRef = useRef<{ mouseX: number; mouseY: number; imageInitialX: number; imageInitialY: number }>({
    mouseX: 0,
    mouseY: 0,
    imageInitialX: 0,
    imageInitialY: 0,
  });

  // Save geometry when changed
  const saveGeometry = useCallback((geo: WindowGeometry) => {
    setGeometry(geo);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(geo));
    } catch {
      // ignore
    }
  }, []);

  // Cleanup on close: reset images and URLs
  const handleClose = useCallback(() => {
    images.forEach((img) => {
      try {
        URL.revokeObjectURL(img.url);
      } catch {
        // ignore
      }
    });
    setImages([]);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    onClose();
  }, [images, onClose]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Window drag handler
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDraggingWindow(true);
    startDragRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: geometry.x,
      initialY: geometry.y,
      initialW: geometry.width,
      initialH: geometry.height,
    };
  };

  // Window resize handler
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizingWindow(true);
    startDragRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: geometry.x,
      initialY: geometry.y,
      initialW: geometry.width,
      initialH: geometry.height,
    };
  };

  // Global mouse move & mouse up for window drag & resize
  useEffect(() => {
    if (!isDraggingWindow && !isResizingWindow && !isPanning && !draggedImageId) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingWindow) {
        const dx = e.clientX - startDragRef.current.mouseX;
        const dy = e.clientY - startDragRef.current.mouseY;
        const newX = Math.max(0, Math.min(window.innerWidth - 60, startDragRef.current.initialX + dx));
        const newY = Math.max(0, Math.min(window.innerHeight - 40, startDragRef.current.initialY + dy));
        setGeometry((prev) => ({ ...prev, x: newX, y: newY }));
      } else if (isResizingWindow) {
        const dx = e.clientX - startDragRef.current.mouseX;
        const dy = e.clientY - startDragRef.current.mouseY;
        const newW = Math.max(360, Math.min(window.innerWidth - geometry.x, startDragRef.current.initialW + dx));
        const newH = Math.max(240, Math.min(window.innerHeight - geometry.y, startDragRef.current.initialH + dy));
        setGeometry((prev) => ({ ...prev, width: newW, height: newH }));
      } else if (isPanning) {
        const dx = e.clientX - panStartRef.current.mouseX;
        const dy = e.clientY - panStartRef.current.mouseY;
        setPan({
          x: panStartRef.current.initialPanX + dx,
          y: panStartRef.current.initialPanY + dy,
        });
      } else if (draggedImageId) {
        const dx = (e.clientX - imageDragRef.current.mouseX) / zoom;
        const dy = (e.clientY - imageDragRef.current.mouseY) / zoom;
        setImages((prev) =>
          prev.map((img) => {
            if (img.id === draggedImageId) {
              return {
                ...img,
                x: Math.round(imageDragRef.current.imageInitialX + dx),
                y: Math.round(imageDragRef.current.imageInitialY + dy),
              };
            }
            return img;
          })
        );
      }
    };

    const handleMouseUp = () => {
      if (isDraggingWindow || isResizingWindow) {
        saveGeometry(geometry);
      }
      setIsDraggingWindow(false);
      setIsResizingWindow(false);
      setIsPanning(false);
      setDraggedImageId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingWindow, isResizingWindow, isPanning, draggedImageId, geometry, zoom, saveGeometry]);

  // Add files to board
  const addImageFiles = useCallback((files: FileList | File[]) => {
    const validImageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (validImageFiles.length === 0) return;

    validImageFiles.forEach((file, index) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      img.onload = () => {
        // Place sequentially or near center
        const offset = (images.length + index) * 35;
        const newImg: BoardImage = {
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          url: objectUrl,
          x: 40 + (offset % 250),
          y: 40 + (offset % 250),
          width: Math.min(img.naturalWidth || 400, 600),
          height: Math.min(img.naturalHeight || 300, 450),
        };
        setImages((prev) => [...prev, newImg]);
      };
    });
  }, [images.length]);

  // Drop handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      addImageFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Clipboard paste handler (Ctrl+V)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        addImageFiles(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, addImageFiles]);

  // Canvas pan start
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.board-image-item')) return;
    setIsPanning(true);
    panStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
    };
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(3, Math.max(0.25, Number((prev * zoomFactor).toFixed(2)))));
  };

  // Image drag start
  const handleImageMouseDown = (e: React.MouseEvent, img: BoardImage) => {
    e.stopPropagation();
    setDraggedImageId(img.id);
    imageDragRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      imageInitialX: img.x,
      imageInitialY: img.y,
    };
  };

  if (!isOpen) return null;

  return (
    <div
      ref={windowRef}
      style={{
        position: 'fixed',
        left: `${geometry.x}px`,
        top: `${geometry.y}px`,
        width: `${geometry.width}px`,
        height: `${geometry.height}px`,
        zIndex: 9999,
      }}
      className="flex flex-col bg-white rounded-lg shadow-2xl border border-[#b8bdc5] overflow-hidden select-none"
    >
      {/* Top Header Bar (STYLEGUIDE_A29: #f0f2f5, border #b8bdc5, text #1c1d1f font-extrabold) */}
      <div
        onMouseDown={handleHeaderMouseDown}
        className="h-[34px] bg-[#f0f2f5] border-b border-[#b8bdc5] px-2.5 flex items-center justify-between cursor-move select-none"
      >
        <div className="flex items-center gap-2">
          <Move className="w-3.5 h-3.5 text-[#555a64]" />
          <span className="text-xs font-extrabold text-[#1c1d1f] tracking-tight">
            Доска скриншотов
          </span>
          <span className="text-[10px] text-[#555a64] font-medium hidden sm:inline">
            (Перетащите картинку или нажмите Ctrl+V)
          </span>
        </div>

        {/* Minimal controls: Zoom - / + and Close ✕ */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.max(0.25, Number((prev - 0.15).toFixed(2))))}
            title="Уменьшить масштаб (-)"
            className="w-6 h-6 flex items-center justify-center rounded border border-[#d9a800] bg-white hover:bg-[#fff9d6] text-[#1c1d1f] transition cursor-pointer text-xs font-bold shadow-2xs"
          >
            <ZoomOut className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            title="Сбросить масштаб на 100%"
            className="px-1.5 h-6 flex items-center justify-center rounded border border-[#d9a800] bg-white hover:bg-[#fff9d6] text-[#1c1d1f] transition cursor-pointer text-[10px] font-extrabold shadow-2xs"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            type="button"
            onClick={() => setZoom((prev) => Math.min(3, Number((prev + 0.15).toFixed(2))))}
            title="Увеличить масштаб (+)"
            className="w-6 h-6 flex items-center justify-center rounded border border-[#d9a800] bg-white hover:bg-[#fff9d6] text-[#1c1d1f] transition cursor-pointer text-xs font-bold shadow-2xs"
          >
            <ZoomIn className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            title="Центрировать холст"
            className="w-6 h-6 flex items-center justify-center rounded border border-[#b8bdc5] bg-white hover:bg-slate-100 text-[#555a64] transition cursor-pointer text-xs font-bold shadow-2xs"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          <div className="w-[1px] h-4 bg-[#b8bdc5] mx-1" />

          {/* Close button ✕ */}
          <button
            type="button"
            onClick={handleClose}
            title="Закрыть (Esc)"
            className="w-6 h-6 flex items-center justify-center rounded border border-red-300 bg-white hover:bg-red-50 text-red-600 transition cursor-pointer text-xs font-bold shadow-2xs"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Board Canvas Area */}
      <div
        ref={canvasRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
        className="flex-1 relative overflow-hidden bg-[#fafafa] cursor-grab active:cursor-grabbing"
        style={{
          backgroundImage:
            'radial-gradient(circle, #cbd5e1 1px, transparent 1px), radial-gradient(circle, #cbd5e1 1px, #fafafa 1px)',
          backgroundSize: '24px 24px',
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* Empty state hint */}
        {images.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 select-none">
            <UploadCloud className="w-12 h-12 mb-2 text-slate-300 animate-bounce" />
            <p className="text-xs font-bold text-[#555a64]">Перетащите сюда скриншоты или вставьте через Ctrl + V</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Только изображения. При закрытии окно очистится.</p>
          </div>
        )}

        {/* Zoomed & Panned Board Container */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            position: 'absolute',
            left: 0,
            top: 0,
          }}
        >
          {images.map((img) => (
            <div
              key={img.id}
              onMouseDown={(e) => handleImageMouseDown(e, img)}
              style={{
                position: 'absolute',
                left: `${img.x}px`,
                top: `${img.y}px`,
                width: `${img.width}px`,
                cursor: draggedImageId === img.id ? 'grabbing' : 'grab',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              }}
              className="board-image-item rounded border-2 border-[#d9a800] bg-white overflow-hidden hover:border-[#b45309] transition-shadow"
            >
              <img
                src={img.url}
                alt="Скриншот"
                draggable={false}
                className="w-full h-auto block select-none pointer-events-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Resize Handle (bottom-right corner) */}
      <div
        onMouseDown={handleResizeMouseDown}
        title="Потяните для изменения размера"
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center text-slate-400 hover:text-slate-600"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};
