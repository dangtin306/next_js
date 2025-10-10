"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { useSearchParams } from "next/navigation";
import { transcode } from "./videoUtils.jsx";

// 🔹 Hàm tải có cache 1 ngày
const toBlobURLWithCache = async (url, type) => {
    const cacheName = "ffmpeg-cache";
    const cache = await caches.open(cacheName);

    // Kiểm tra xem file đã cache chưa
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
        // 🕒 Kiểm tra hạn cache (1 ngày)
        const dateHeader = cachedResponse.headers.get("date");
        if (dateHeader) {
            const cachedTime = new Date(dateHeader).getTime();
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;
            if (now - cachedTime < oneDay) {
                const blob = await cachedResponse.blob();
                return URL.createObjectURL(blob);
            }
        }
    }

    // ⚡ Nếu chưa cache hoặc cache hết hạn, tải lại
    const response = await fetch(url, { cache: "reload" });
    const headers = new Headers(response.headers);
    headers.set("date", new Date().toUTCString());

    // Lưu vào cache
    const responseToCache = new Response(await response.blob(), { headers });
    await cache.put(url, responseToCache.clone());

    const blob = await responseToCache.blob();
    return URL.createObjectURL(blob);
};

function VideoProcessorInner() {
    const [loaded, setLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [output, setOutput] = useState(null);
    const [progress, setProgress] = useState("");
    const [uploadStatus, setUploadStatus] = useState("");
    const [progress_video, set_progress_video] = useState(false);

    const searchParams = useSearchParams();
    const ffmpegRef = useRef(new FFmpeg());
    const videoRef = useRef(null);

    const load = async () => {
        if (loaded || isLoading) return;

        const ffmpeg = ffmpegRef.current;
        // 🧹 Dọn sạch thủ công nếu đã từng load trước đó
        try {
            // Xoá tất cả file tạm trong FS (RAM)
            for (const file of await ffmpeg.listDir("/")) {
                if (file.name !== "." && file.name !== "..") {
                    await ffmpeg.deleteFile(file.name);
                }
            }

            // Dừng worker để giải phóng RAM (nếu có)
            if (ffmpeg.worker) {
                ffmpeg.worker.terminate();
                ffmpeg.worker = null;
            }
        } catch (err) {
            console.warn("⚠️ Không thể dọn FFmpeg:", err);
        }
        ffmpeg.on("log", ({ message }) => setProgress(message));

        const baseURL = "https://hust.media/javascript/ffmpeg";

        setIsLoading(true);

        try {
            await ffmpeg.load({
                coreURL: await toBlobURLWithCache(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
                wasmURL: await toBlobURLWithCache(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
                workerURL: await toBlobURLWithCache(`${baseURL}/ffmpeg-core.worker.js`, "text/javascript"),
            });
        } catch (err) {
            console.error("Lỗi khi tải FFmpeg:", err);
        } finally {
            setLoaded(true);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => load(), 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="px-8 mt-5 flex flex-col items-center gap-4">
            <button
                onClick={() => window.history.back()}
                className="mt-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition"
            >
                ⬅️ Quay lại
            </button>

            {!loaded ? (
                <div className="text-gray-600">
                    {isLoading ? "⏳ Đang tải ffmpeg-core..." : "⏳ Chuẩn bị tải ffmpeg-core..."}
                </div>
            ) : (
                <>
                    {uploadStatus && (
                        <div className="text-xl text-center mt-2 text-green-600">{uploadStatus}</div>
                    )}

                    <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file)
                                transcode(file, ffmpegRef, setProgress, setOutput, setUploadStatus, set_progress_video);
                        }}
                        className="border p-2"
                    />

                    {output && !isLoading && progress_video && (
                        <div className="mt-4 text-center">
                            <h2 className="font-bold mb-2">🎥 Video sau khi nén (max speed)</h2>
                            <video ref={videoRef} src={output} controls width="400" />
                            <a href={output} download="compressed.mp4" className="block mt-2 text-blue-500 hover:underline">
                                ⬇️ Tải xuống video
                            </a>
                        </div>
                    )}

                    {progress && (
                        <pre className="text-xs text-gray-500 mt-2 whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {progress}
                        </pre>
                    )}
                </>
            )}
        </div>
    );
}

export default function VideoProcessorPage() {
    return (
        <Suspense fallback={<div className="p-8 text-gray-600">Đang tải...</div>}>
            <VideoProcessorInner />
        </Suspense>
    );
}
