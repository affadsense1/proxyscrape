/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone', // 启用 standalone 模式用于 Docker
    
    // 优化字体加载，避免构建时下载超时
    optimizeFonts: false, // 禁用字体优化，避免构建时网络问题
    
    // 配置 standalone 模式不要复制 bin 目录（我们会手动复制）
    // Next.js standalone 默认只复制必要的文件，bin 目录需要在 Dockerfile 中单独处理
    
    // 或者使用以下配置允许更长的超时时间
    // experimental: {
    //     fontLoaders: [
    //         { loader: '@next/font/google', options: { subsets: ['latin'] } },
    //     ],
    // },
};

export default nextConfig;
