import React, { useEffect, useRef, useState } from 'react';
import { Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
	WhiteboardHistoryAction,
	WhiteboardImage,
	WhiteboardRuntimeAction,
	WhiteboardStroke,
	WhiteboardSyncedAction,
	WhiteboardText,
	WhiteboardTool,
} from '@/live/lib/liveWhiteboard';
import { appendWhiteboardHistory, createWhiteboardActionId, getWhiteboardHistorySignature, updateWhiteboardHistoryItem } from '@/live/components/studio-live/whiteboard/history';
import WhiteboardTextDraftOverlay from '@/live/components/studio-live/whiteboard/WhiteboardTextDraftOverlay';
import WhiteboardToolbar from '@/live/components/studio-live/whiteboard/WhiteboardToolbar';
import type { DragState, PendingTransformPayload, SelectionState, TextDraft, WhiteboardProps } from '@/live/components/studio-live/whiteboard/types';

const LiveStudioWhiteboard: React.FC<WhiteboardProps> = ({ boardId, isHost, onWhiteboardAction, remoteWhiteboardAction, historySnapshot = [] }) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const historyRef = useRef<WhiteboardHistoryAction[]>([]);
	const undoStackRef = useRef<WhiteboardHistoryAction[][]>([]);
	const redoStackRef = useRef<WhiteboardHistoryAction[][]>([]);
	const currentStrokeRef = useRef<WhiteboardStroke | null>(null);
	const imageInsertModeRef = useRef<'full' | 'floating'>('full');
	const drawSequenceRef = useRef(0);
	const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
	const selectedItemRef = useRef<SelectionState | null>(null);
	const dragOriginHistoryRef = useRef<WhiteboardHistoryAction[] | null>(null);
	const pendingTransformPayloadRef = useRef<PendingTransformPayload | null>(null);
	const transformFrameRef = useRef<number | null>(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const [tool, setTool] = useState<WhiteboardTool>('pen');
	const [color, setColor] = useState('#38bdf8');
	const [strokeWidth, setStrokeWidth] = useState(4);
	const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
	const [history, setHistory] = useState<WhiteboardHistoryAction[]>([]);
	const [dragState, setDragState] = useState<DragState | null>(null);
	const [selectedItem, setSelectedItem] = useState<SelectionState | null>(null);
	const [canUndo, setCanUndo] = useState(false);
	const [canRedo, setCanRedo] = useState(false);

	const emitWhiteboardAction = (action: WhiteboardRuntimeAction | WhiteboardHistoryAction | { type: 'clear' }) => {
		onWhiteboardAction?.({
			...action,
			boardId,
		} as WhiteboardSyncedAction);
	};

	const flushPendingTransform = () => {
		if (!pendingTransformPayloadRef.current) {
			return;
		}

		emitWhiteboardAction({
			type: 'item_transform',
			payload: pendingTransformPayloadRef.current,
		});
		pendingTransformPayloadRef.current = null;
	};

	const scheduleTransformBroadcast = (payload: PendingTransformPayload) => {
		pendingTransformPayloadRef.current = payload;

		if (transformFrameRef.current !== null) {
			return;
		}

		transformFrameRef.current = window.requestAnimationFrame(() => {
			transformFrameRef.current = null;
			flushPendingTransform();
		});
	};

	const commitHistory = (nextHistory: WhiteboardHistoryAction[]) => {
		historyRef.current = nextHistory;
		setHistory(nextHistory);
	};

	const syncHistoryControls = () => {
		setCanUndo(undoStackRef.current.length > 0);
		setCanRedo(redoStackRef.current.length > 0);
	};

	const pushUndoSnapshot = (snapshot: WhiteboardHistoryAction[]) => {
		undoStackRef.current = [...undoStackRef.current, snapshot];
		redoStackRef.current = [];
		syncHistoryControls();
	};

	const broadcastFullHistory = (nextHistory: WhiteboardHistoryAction[]) => {
		if (!isHost) {
			return;
		}

		emitWhiteboardAction({
			type: 'sync_full',
			history: nextHistory,
		});
	};

	const appendToHistory = (action: WhiteboardHistoryAction) => {
		pushUndoSnapshot(historyRef.current);
		const nextHistory = appendWhiteboardHistory(historyRef.current, action);
		commitHistory(nextHistory);
		return nextHistory;
	};

	const updateHistoryItem = (
		targetId: string,
		targetType: 'image' | 'text',
		updates: Partial<WhiteboardImage & WhiteboardText>,
	) => {
		const nextHistory = updateWhiteboardHistoryItem(historyRef.current, targetId, targetType, updates);

		commitHistory(nextHistory);
		return nextHistory;
	};

	const getCoordinates = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return { x: 0, y: 0, clientX: 0, clientY: 0, rect: { left: 0, top: 0 } as DOMRect };
		const rect = canvas.getBoundingClientRect();
		let clientX;
		let clientY;
		if ('touches' in event) {
			clientX = event.touches[0].clientX;
			clientY = event.touches[0].clientY;
		} else {
			clientX = event.clientX;
			clientY = event.clientY;
		}
		const x = (clientX - rect.left) * (canvas.width / rect.width);
		const y = (clientY - rect.top) * (canvas.height / rect.height);
		return { x, y, clientX, clientY, rect };
	};

	const getImageElement = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
		const cached = imageCacheRef.current[src];
		if (cached && cached.complete && cached.naturalWidth > 0) {
			resolve(cached);
			return;
		}

		const image = cached || new Image();
		imageCacheRef.current[src] = image;
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error('Image whiteboard load failed'));

		if (image.src !== src) {
			image.src = src;
		} else if (image.complete && image.naturalWidth > 0) {
			resolve(image);
		}
	});

	const drawStroke = (ctx: CanvasRenderingContext2D, stroke: WhiteboardStroke) => {
		if (!stroke.points.length) return;

		ctx.save();
		ctx.beginPath();
		ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
		ctx.lineWidth = stroke.tool === 'eraser' ? stroke.strokeWidth * 6 : stroke.strokeWidth;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
		ctx.strokeStyle = stroke.color;

		for (let index = 1; index < stroke.points.length; index += 1) {
			ctx.lineTo(stroke.points[index].x, stroke.points[index].y);
		}

		if (stroke.points.length === 1) {
			ctx.lineTo(stroke.points[0].x + 0.01, stroke.points[0].y + 0.01);
		}

		ctx.stroke();
		ctx.restore();
	};

	const drawText = (ctx: CanvasRenderingContext2D, textData: WhiteboardText) => {
		ctx.save();
		ctx.globalCompositeOperation = 'source-over';
		ctx.font = `700 ${textData.fontSize}px sans-serif`;
		ctx.textBaseline = 'top';
		ctx.fillStyle = textData.color;
		ctx.fillText(textData.text, textData.x, textData.y);
		ctx.restore();
	};

	const measureTextBounds = (ctx: CanvasRenderingContext2D, textData: WhiteboardText) => {
		ctx.save();
		ctx.font = `700 ${textData.fontSize}px sans-serif`;
		const metrics = ctx.measureText(textData.text);
		ctx.restore();

		return {
			x: textData.x,
			y: textData.y,
			width: Math.max(metrics.width, 24),
			height: textData.fontSize,
		};
	};

	const getSelectionBounds = (ctx: CanvasRenderingContext2D, selection: SelectionState | null) => {
		if (!selection) return null;

		const action = historyRef.current.find((entry) => entry.type === selection.type && entry.payload.id === selection.id);
		if (!action) return null;

		if (action.type === 'image') {
			return {
				x: action.payload.x,
				y: action.payload.y,
				width: action.payload.width,
				height: action.payload.height,
			};
		}

		if (action.type === 'text') {
			return measureTextBounds(ctx, action.payload);
		}

		return null;
	};

	const drawSelectionOverlay = (ctx: CanvasRenderingContext2D) => {
		if (!isHost || tool !== 'move') return;

		const bounds = getSelectionBounds(ctx, selectedItemRef.current);
		if (!bounds) return;

		ctx.save();
		ctx.strokeStyle = 'rgba(250, 204, 21, 0.95)';
		ctx.lineWidth = 3;
		ctx.setLineDash([10, 8]);
		ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
		ctx.setLineDash([]);

		const handleSize = 16;
		ctx.fillStyle = 'rgba(250, 204, 21, 1)';
		ctx.fillRect(bounds.x + bounds.width - handleSize / 2, bounds.y + bounds.height - handleSize / 2, handleSize, handleSize);
		ctx.restore();
	};

	const drawImageAction = async (ctx: CanvasRenderingContext2D, imageData: WhiteboardImage) => {
		const image = await getImageElement(imageData.src);
		ctx.save();
		ctx.globalCompositeOperation = 'source-over';
		ctx.drawImage(image, imageData.x, imageData.y, imageData.width, imageData.height);
		ctx.restore();
	};

	const renderAction = async (ctx: CanvasRenderingContext2D, action: WhiteboardHistoryAction) => {
		if (action.type === 'stroke') {
			drawStroke(ctx, action.payload);
			return;
		}

		if (action.type === 'text') {
			drawText(ctx, action.payload);
			return;
		}

		await drawImageAction(ctx, action.payload);
	};

	const redrawHistory = async (items: WhiteboardHistoryAction[], previewStroke?: WhiteboardStroke | null) => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext('2d');
		if (!canvas || !ctx) return;

		const sequence = ++drawSequenceRef.current;
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		for (const action of items) {
			await renderAction(ctx, action);
			if (sequence !== drawSequenceRef.current) {
				return;
			}
		}

		if (previewStroke) {
			drawStroke(ctx, previewStroke);
		}

		drawSelectionOverlay(ctx);
	};

	const findImageAtPoint = (x: number, y: number) => {
		for (let index = historyRef.current.length - 1; index >= 0; index -= 1) {
			const action = historyRef.current[index];
			if (action.type !== 'image') {
				continue;
			}

			const { payload } = action;
			const isInside = x >= payload.x && x <= payload.x + payload.width && y >= payload.y && y <= payload.y + payload.height;
			if (isInside) {
				return payload;
			}
		}

		return null;
	};

	const findTextAtPoint = (x: number, y: number) => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext('2d');
		if (!ctx) return null;

		for (let index = historyRef.current.length - 1; index >= 0; index -= 1) {
			const action = historyRef.current[index];
			if (action.type !== 'text') {
				continue;
			}

			const bounds = measureTextBounds(ctx, action.payload);
			const isInside = x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
			if (isInside) {
				return action.payload;
			}
		}

		return null;
	};

	const isOnResizeHandle = (x: number, y: number, image: WhiteboardImage) => {
		const handleSize = 28;
		return (
			x >= image.x + image.width - handleSize &&
			x <= image.x + image.width + handleSize &&
			y >= image.y + image.height - handleSize &&
			y <= image.y + image.height + handleSize
		);
	};

	const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
		if (!isHost) return;
		const { x, y, clientX, clientY, rect } = getCoordinates(event);

		if (tool === 'type') {
			setTextDraft({
				canvasX: x,
				canvasY: y,
				screenX: clientX - rect.left,
				screenY: clientY - rect.top,
				value: '',
			});
			return;
		}

		if (tool === 'move') {
			const image = findImageAtPoint(x, y);
			if (image) {
				const mode = isOnResizeHandle(x, y, image) ? 'resize' : 'move';
				const nextSelection = { id: image.id, type: 'image' as const };
				selectedItemRef.current = nextSelection;
				setSelectedItem(nextSelection);
				dragOriginHistoryRef.current = historyRef.current;
				setDragState({
					targetId: image.id,
					targetType: 'image',
					mode,
					offsetX: x - image.x,
					offsetY: y - image.y,
					originX: image.x,
					originY: image.y,
					originWidth: image.width,
					originHeight: image.height,
				});
				void redrawHistory(historyRef.current);
				return;
			}

			const text = findTextAtPoint(x, y);
			if (text) {
				const nextSelection = { id: text.id, type: 'text' as const };
				selectedItemRef.current = nextSelection;
				setSelectedItem(nextSelection);
				dragOriginHistoryRef.current = historyRef.current;
				setDragState({
					targetId: text.id,
					targetType: 'text',
					mode: 'move',
					offsetX: x - text.x,
					offsetY: y - text.y,
					originX: text.x,
					originY: text.y,
				});
				void redrawHistory(historyRef.current);
			} else {
				selectedItemRef.current = null;
				setSelectedItem(null);
				void redrawHistory(historyRef.current);
			}
			return;
		}

		setIsDrawing(true);
		const nextStroke: WhiteboardStroke = {
			id: createWhiteboardActionId(),
			tool: tool === 'eraser' ? 'eraser' : 'pen',
			color,
			strokeWidth,
			points: [{ x, y }],
		};

		currentStrokeRef.current = nextStroke;
		void redrawHistory(historyRef.current, nextStroke);
	};

	const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
		const { x, y } = getCoordinates(event);

		if (dragState) {
			const updates = dragState.mode === 'resize'
				? {
						width: Math.max(80, (dragState.originWidth || 0) + (x - dragState.originX - (dragState.originWidth || 0))),
						height: Math.max(80, (dragState.originHeight || 0) + (y - dragState.originY - (dragState.originHeight || 0))),
					}
				: {
						x: x - dragState.offsetX,
						y: y - dragState.offsetY,
					};

			const nextHistory = updateHistoryItem(dragState.targetId, dragState.targetType, updates);
			void redrawHistory(nextHistory);

			scheduleTransformBroadcast({
				targetId: dragState.targetId,
				targetType: dragState.targetType,
				updates,
			});
			return;
		}

		if (!isDrawing || !isHost || tool === 'type' || tool === 'move') return;

		const currentStroke = currentStrokeRef.current;
		if (!currentStroke) return;

		const lastPoint = currentStroke.points[currentStroke.points.length - 1];
		if (lastPoint?.x === x && lastPoint?.y === y) {
			return;
		}

		const updatedStroke: WhiteboardStroke = {
			...currentStroke,
			points: [...currentStroke.points, { x, y }],
		};

		currentStrokeRef.current = updatedStroke;
		void redrawHistory(historyRef.current, updatedStroke);

		emitWhiteboardAction({ type: 'stroke_update', payload: updatedStroke });
	};

	const endDrawing = () => {
		if (dragState) {
			flushPendingTransform();
			if (dragOriginHistoryRef.current && dragOriginHistoryRef.current !== historyRef.current) {
				pushUndoSnapshot(dragOriginHistoryRef.current);
			}
			dragOriginHistoryRef.current = null;
			setDragState(null);
			return;
		}

		if (isDrawing && currentStrokeRef.current) {
			const finalizedStrokeAction: WhiteboardHistoryAction = {
				type: 'stroke',
				payload: currentStrokeRef.current,
			};
			appendToHistory(finalizedStrokeAction);
			emitWhiteboardAction(finalizedStrokeAction);
			currentStrokeRef.current = null;
			void redrawHistory(historyRef.current);
		}

		setIsDrawing(false);
	};

	const clearCanvas = () => {
		if (!historyRef.current.length) {
			return;
		}

		pushUndoSnapshot(historyRef.current);
		commitHistory([]);
		void redrawHistory([]);
		if (isHost) {
			emitWhiteboardAction({ type: 'clear' });
		}
	};

	const undoLastAction = () => {
		const previousHistory = undoStackRef.current[undoStackRef.current.length - 1];
		if (!previousHistory) {
			return;
		}

		undoStackRef.current = undoStackRef.current.slice(0, -1);
		redoStackRef.current = [...redoStackRef.current, historyRef.current];
		commitHistory(previousHistory);
		selectedItemRef.current = null;
		setSelectedItem(null);
		setDragState(null);
		void redrawHistory(previousHistory);
		broadcastFullHistory(previousHistory);
		syncHistoryControls();
	};

	const redoLastAction = () => {
		const nextHistory = redoStackRef.current[redoStackRef.current.length - 1];
		if (!nextHistory) {
			return;
		}

		redoStackRef.current = redoStackRef.current.slice(0, -1);
		undoStackRef.current = [...undoStackRef.current, historyRef.current];
		commitHistory(nextHistory);
		selectedItemRef.current = null;
		setSelectedItem(null);
		setDragState(null);
		void redrawHistory(nextHistory);
		broadcastFullHistory(nextHistory);
		syncHistoryControls();
	};

	const commitTextDraft = () => {
		if (!textDraft) return;

		const value = textDraft.value.trim();
		if (!value) {
			setTextDraft(null);
			setTool('pen');
			return;
		}

		const nextTextAction: WhiteboardHistoryAction = {
			type: 'text',
			payload: {
				id: createWhiteboardActionId(),
				text: value,
				x: textDraft.canvasX,
				y: textDraft.canvasY,
				color,
				fontSize: 42,
			},
		};

		appendToHistory(nextTextAction);
		selectedItemRef.current = { id: nextTextAction.payload.id, type: 'text' };
		setSelectedItem({ id: nextTextAction.payload.id, type: 'text' });
		void redrawHistory(historyRef.current);
		if (isHost) {
			emitWhiteboardAction(nextTextAction);
		}

		setTextDraft(null);
		setTool('pen');
	};

	const cancelTextDraft = () => {
		setTextDraft(null);
		setTool('pen');
	};

	useEffect(() => {
		if (getWhiteboardHistorySignature(historySnapshot) === getWhiteboardHistorySignature(historyRef.current)) {
			return;
		}

		commitHistory(historySnapshot);
		void redrawHistory(historySnapshot, currentStrokeRef.current);
	}, [historySnapshot]);

	useEffect(() => {
		undoStackRef.current = [];
		redoStackRef.current = [];
		dragOriginHistoryRef.current = null;
		syncHistoryControls();
	}, [boardId]);

	useEffect(() => {
		if (!remoteWhiteboardAction) return;
		if (remoteWhiteboardAction.boardId !== boardId) return;
		if (remoteWhiteboardAction.type !== 'stroke_update') return;

		void redrawHistory(historyRef.current, remoteWhiteboardAction.payload as WhiteboardStroke);
	}, [boardId, remoteWhiteboardAction]);

	useEffect(() => {
		historyRef.current = history;
	}, [history]);

	useEffect(() => {
		selectedItemRef.current = selectedItem;
	}, [selectedItem]);

	useEffect(() => {
		if (tool !== 'move') {
			flushPendingTransform();
			selectedItemRef.current = null;
			setSelectedItem(null);
			setDragState(null);
			void redrawHistory(historyRef.current, currentStrokeRef.current);
		}
	}, [tool]);

	useEffect(() => {
		return () => {
			if (transformFrameRef.current !== null) {
				window.cancelAnimationFrame(transformFrameRef.current);
			}
		};
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const resizeCanvas = () => {
			canvas.width = 1920;
			canvas.height = 1080;
			void redrawHistory(historyRef.current, currentStrokeRef.current);
		};

		resizeCanvas();
		const handleFullscreenChange = () => window.setTimeout(resizeCanvas, 100);

		window.addEventListener('resize', resizeCanvas);
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		return () => {
			window.removeEventListener('resize', resizeCanvas);
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
		};
	}, []);

	const toggleFullscreen = async () => {
		try {
			if (!document.fullscreenElement) {
				await containerRef.current?.requestFullscreen();
				if (window.screen && window.screen.orientation) {
					await window.screen.orientation.lock('landscape').catch(() => {});
				}
			} else {
				await document.exitFullscreen();
			}
		} catch (error) {
			console.error(error);
		}
	};

	const openImagePicker = (mode: 'full' | 'floating') => {
		imageInsertModeRef.current = mode;
		fileInputRef.current?.click();
	};

	const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		const canvas = canvasRef.current;
		if (!file || !canvas) {
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			const src = typeof reader.result === 'string' ? reader.result : null;
			if (!src) {
				return;
			}

			const image = new Image();
			image.onload = () => {
				const mode = imageInsertModeRef.current;
				const maxWidth = mode === 'full' ? canvas.width * 0.88 : canvas.width * 0.34;
				const maxHeight = mode === 'full' ? canvas.height * 0.88 : canvas.height * 0.34;
				const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
				const width = image.width * scale;
				const height = image.height * scale;

				const imageAction: WhiteboardHistoryAction = {
					type: 'image',
					payload: {
						id: createWhiteboardActionId(),
						src,
						x: (canvas.width - width) / 2,
						y: (canvas.height - height) / 2,
						width,
						height,
					},
				};

				appendToHistory(imageAction);
				selectedItemRef.current = { id: imageAction.payload.id, type: 'image' };
				setSelectedItem({ id: imageAction.payload.id, type: 'image' });
				void redrawHistory(historyRef.current);

				emitWhiteboardAction(imageAction);

				if (mode === 'floating') {
					setTool('move');
				}
			};
			image.src = src;
		};

		reader.readAsDataURL(file);
		event.target.value = '';
	};

	return (
		<div className="flex h-full w-full flex-col bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
			{isHost && (
				<WhiteboardToolbar
					fileInputRef={fileInputRef}
					canUndo={canUndo}
					canRedo={canRedo}
					tool={tool}
					color={color}
					onUndo={undoLastAction}
					onRedo={redoLastAction}
					onToolChange={setTool}
					onImportImage={() => openImagePicker('floating')}
					onColorChange={(nextColor) => {
						setColor(nextColor);
						if (tool === 'eraser') setTool('pen');
					}}
					onClear={clearCanvas}
					onImageUpload={handleImageUpload}
				/>
			)}

			<div ref={containerRef} className="relative flex flex-1 items-center justify-center bg-zinc-950 cursor-crosshair overflow-hidden touch-none h-full w-full">
				<div className="relative w-full max-w-full max-h-full aspect-video shadow-2xl bg-zinc-900 overflow-hidden ring-1 ring-white/10">
					<div
						className="absolute inset-0 pointer-events-none opacity-20"
						style={{
							backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)',
							backgroundSize: '24px 24px',
						}}
					/>
					<canvas
						ref={canvasRef}
						onMouseDown={startDrawing}
						onMouseMove={draw}
						onMouseUp={endDrawing}
						onMouseOut={endDrawing}
						onTouchStart={startDrawing}
						onTouchMove={draw}
						onTouchEnd={endDrawing}
						onTouchCancel={endDrawing}
						className="w-full h-full block"
					/>

					{textDraft && (
						<WhiteboardTextDraftOverlay
							textDraft={textDraft}
							onChange={(value) => setTextDraft((current) => current ? { ...current, value } : current)}
							onCommit={commitTextDraft}
							onCancel={cancelTextDraft}
						/>
					)}
				</div>

				<Button variant="ghost" size="icon" onClick={toggleFullscreen} className="absolute bottom-4 right-4 h-10 w-10 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md z-50">
					<Maximize className="h-5 w-5" />
				</Button>
			</div>
		</div>
	);
};

export default LiveStudioWhiteboard;