/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Thay thế cho "next export"
  basePath: '/next_js',          // 👈 thêm dòng này
  assetPrefix: '/next_js/',      // 👈 và dòng này
  images: {
    unoptimized: true, // tránh lỗi khi export ảnh
  },
  async headers() {
    return [
      {
        source: '/(.*)', // áp dụng cho tất cả route
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
