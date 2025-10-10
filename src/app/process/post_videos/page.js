"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { useSearchParams } from "next/navigation";

function VideoProcessorInner() {
    const [loaded, setLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [output, setOutput] = useState(null);
    const [progress, setProgress] = useState("");
    const [uploadStatus, setUploadStatus] = useState("");
    const [id_videos_info, set_id_videos_info] = useState("");

    const searchParams = useSearchParams();
    const ffmpegRef = useRef(new FFmpeg());
    const videoRef = useRef(null);

    // 🚀 Load ffmpeg-core-mt
    const load = async () => {
        if (loaded || isLoading) return;
        setIsLoading(true);

        const ffmpeg = ffmpegRef.current;
        const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/umd";

        ffmpeg.on("log", ({ message }) => setProgress(message));

        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
            workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, "text/javascript"),
        });

        setLoaded(true);
        setIsLoading(false);
    };

    // ⚙️ Nén video + gửi sang server
    const transcode = async (file) => {
        const ffmpeg = ffmpegRef.current;
        setUploadStatus("");
        setProgress("🔄 Đang nén video...");

        await ffmpeg.writeFile("input.mp4", await fetchFile(file));

        await ffmpeg.exec([
            "-i", "input.mp4",
            "-c:v", "libx264",
            "-b:v", "800k",
            "-preset", "ultrafast",
            "-vf", "scale=-2:720",
            "-r", "30", // 👈 ép tốc độ khung hình về 30fps
            "-threads", "0",
            "-c:a", "copy",
            "output.mp4"
        ]);

        setProgress("✅ Nén xong, đang đọc dữ liệu...");

        const data = await ffmpeg.readFile("output.mp4");
        const blob = new Blob([data.buffer], { type: "video/mp4" });
        const url = URL.createObjectURL(blob);
        setOutput(url);

        // 🚀 Gửi video sang Flask server
        setUploadStatus("📤 Đang gửi video lên server...");
        try {
            const formData = new FormData();
            formData.append("file", blob, "compressed.mp4");

            const response = await fetch(`https://hust.media/link/load_mode/mode_videos/mode_videos_dynamic.php?mode=post_videos`, {
                method: "POST",
                body: formData,
            });

            if (response.ok)
                setUploadStatus("✅ Gửi thành công! Ấn quay lại để tiếp tục.");
            else
                setUploadStatus(`❌ Gửi thất bại: ${response.statusText}`);
        } catch (err) {
            setUploadStatus("⚠️ Lỗi khi gửi video: " + err.message);
        }
    };

    // 🔥 Load ffmpeg-core-mt sau 0.5s
    useEffect(() => {
        const id = searchParams.get("id_videos_info");
        if (id) set_id_videos_info(id);
        const timer = setTimeout(() => load(), 500);
        return () => clearTimeout(timer);
    }, [searchParams]);

    return (
        <div className="p-8 flex flex-col items-center gap-4">
            {!loaded ? (
                <div className="text-gray-600">
                    {isLoading ? "⏳ Đang tải ffmpeg-core-mt..." : "⏳ Chuẩn bị tải ffmpeg-core-mt..."}
                </div>
            ) : (
                <>
                    <button
                        onClick={() => window.history.back()}
                        className="mt-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition"
                    >
                        ⬅️ Quay lại
                    </button>

                    {uploadStatus && (
                        <div className="text-xl text-center mt-2 text-green-600">
                            {uploadStatus}
                        </div>
                    )}

                    <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) transcode(file);
                        }}
                        className="border p-2"
                    />

                    {output && !isLoading && !progress.includes("Đang nén") && (
                        <div className="mt-4 text-center">
                            <h2 className="font-bold mb-2">🎥 Video sau khi nén (max speed)</h2>
                            <video ref={videoRef} src={output} controls width="400" />
                            <a
                                href={output}
                                download="compressed.mp4"
                                className="block mt-2 text-blue-500 hover:underline"
                            >
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

// ✅ Component chính bọc Suspense chuẩn
export default function VideoProcessorPage() {
    return (
        <Suspense fallback={<div className="p-8 text-gray-600">Đang tải...</div>}>
            <VideoProcessorInner />
        </Suspense>
    );
}
