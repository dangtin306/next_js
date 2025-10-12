import Cookies from "js-cookie";

export const transcode = async (file, ffmpegRef, setProgress, setOutput, setUploadStatus, set_progress_video) => {
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
        alert("❌ File quá lớn! Chỉ chấp nhận tối đa 500MB.");
        return;
    }

    set_progress_video(false);
    const ffmpeg = ffmpegRef.current;
    setUploadStatus("");
    setProgress("🔄 Đang nạp video...");

    const buffer = await file.arrayBuffer();
    await ffmpeg.writeFile("input.mp4", new Uint8Array(buffer));
    setProgress("🔄 Đang nén video...");

    await ffmpeg.exec([
        "-i", "input.mp4",
        "-c:v", "libx264",
        "-b:v", "800k",
        "-preset", "ultrafast",
        "-vf", "scale=-2:720",
        "-r", "30",
        "-threads", "0",
        "-c:a", "copy",
        "output.mp4"
    ]);

    setProgress("✅ Nén xong, đang đọc dữ liệu...");

    const data = await ffmpeg.readFile("output.mp4");
    const blob = new Blob([data.buffer], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);
    setOutput(url);

    // 🚀 Gửi video sang server
    setUploadStatus("📤 Đang gửi video lên server...");
    try {
        const formData = new FormData();
        formData.append("file", blob, "compressed.mp4");

        const response = await fetch(`http://vip.tecom.pro:8789/videos_job?mode=post_videos`, {
            method: "POST",
            body: formData,
        });

        if (response.ok) {
            Cookies.set('upload_videos_check', true, { expires: 300 });
            setUploadStatus("✅ Gửi thành công! Ấn quay lại để tiếp tục.");
        } else {
            setUploadStatus(`❌ Gửi thất bại: ${response.statusText}`);
        }
        set_progress_video(true);
    } catch (err) {
        set_progress_video(true);
        setUploadStatus("⚠️ Lỗi khi gửi video: " + err.message);
    }
};

