"use client";
import { forwardRef, useImperativeHandle, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import mqtt from "mqtt";

const Mqtt = forwardRef((props, ref) => {
    const searchParams = useSearchParams();
    const params = new URLSearchParams(searchParams.toString());
    const code_item = params.get("code_item");
    const clientRef = useRef(null);

    // 👉 Hàm có thể được gọi từ file mẹ
    const sayHello = () => {
        alert("👋 Xin chào từ Mqtt component!");
    };

    // ✅ Kết nối MQTT khi component mount
    useEffect(() => {
        if (!code_item) {
            console.warn("⚠️ Không có code_item trong URL — bỏ qua MQTT.");
            return;
        }

        console.log("🧩 Khởi tạo MQTT WebSocket...");
        const client = mqtt.connect("ws://vip.tecom.pro:8793", {
            will: {
                topic: "server_log",
                payload: `Client ${code_item} đã ngắt kết nối`,
                qos: 0,
                retain: false,
            },
        });
        clientRef.current = client;

        client.on("connect", () => {
            console.log("✅ MQTT WebSocket connected!");
            client.subscribe(code_item, (err) => {
                if (err) return console.error("❌ Subscribe thất bại:", err.message);
                console.log(`📡 Subscribed to topic: ${code_item}`);
                client.publish("server_log", `Client ${code_item} đã kết nối`);
            });
        });

        client.on("message", (topic, message) => {
            const now = new Date().toLocaleTimeString();
            console.log(`[${now}] 📩 ${topic}: ${message.toString()}`);
        });

        client.on("error", (err) => {
            console.error("⚠️ MQTT error:", err.message);
        });

        client.on("close", () => {
            console.log("🔴 MQTT WebSocket disconnected");
        });

        return () => {
            console.log("🔌 Ngắt MQTT client khi component unmount");
            client.end(true);
        };
    }, []);
    // 👉 Hàm gửi JSON lên topic `code_item`
    const publishMessage = () => {
        if (!clientRef.current || !clientRef.current.connected) {
            console.warn("⚠️ MQTT client chưa sẵn sàng để gửi message.");
            return;
        }

        if (!code_item) {
            console.warn("⚠️ Không có code_item — không thể gửi message.");
            return;
        }

        const payload = {
            mode: "posts",
            category: "upload_videos_check",
            value: true,
        };

        clientRef.current.publish(code_item, JSON.stringify(payload));
        console.log("📤 Đã gửi message:", payload);
    };
    // Cho phép file mẹ truy cập vào hàm này qua ref
    useImperativeHandle(ref, () => ({
        sayHello, publishMessage
    }));

    return (
        <></>
    );
});

Mqtt.displayName = "Mqtt";
export default Mqtt;
