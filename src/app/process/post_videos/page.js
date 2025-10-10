"use client"; // 🔥 Bắt buộc phải đứng trên cùng


import { useEffect, useRef, useState, Suspense } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { useSearchParams } from "next/navigation";
import { transcode } from "./videoUtils.jsx"; // <-- import file mới

function VideoProcessorInner() {
    const [loaded, setLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [output, setOutput] = useState(null);
    const [progress, setProgress] = useState("");
    const [uploadStatus, setUploadStatus] = useState("");
    const [id_videos_info, set_id_videos_info] = useState("");
    const [progress_video, set_progress_video] = useState(false);

    const searchParams = useSearchParams();
    const ffmpegRef = useRef(new FFmpeg());
    const videoRef = useRef(null);

    const load = async () => {
        if (loaded || isLoading) return;
        setIsLoading(true);

        const ffmpeg = ffmpegRef.current;
        const baseURL = "https://hust.media/javascript/ffmpeg";

        ffmpeg.on("log", ({ message }) => setProgress(message));

        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
            workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, "text/javascript"),
        });

        setLoaded(true);
        setIsLoading(false);
    };

    useEffect(() => {
        const id = searchParams.get("id_videos_info");
        if (id) set_id_videos_info(id);
        const timer = setTimeout(() => load(), 500);
        return () => clearTimeout(timer);
    }, [searchParams]);

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
                    {isLoading ? "⏳ Đang tải ffmpeg-core-mt..." : "⏳ Chuẩn bị tải ffmpeg-core-mt..."}
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
                            if (file) transcode(file, ffmpegRef, setProgress, setOutput, setUploadStatus, set_progress_video);
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
                        <pre className="text-xs text-gray-500 mt-2 whitespace-pre-wrap max-h-48 overflow-y-auto">{progress}</pre>
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
