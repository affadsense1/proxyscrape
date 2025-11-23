import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const binDir = path.join(__dirname, '..', 'bin');

const isWindows = process.platform === 'win32';
const coreFileName = isWindows ? 'mihomo.exe' : 'mihomo';
const corePath = path.join(binDir, coreFileName);

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('  Mihomo (Clash Meta) Core 下载助手');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

if (fs.existsSync(corePath)) {
    console.log('✅ Mihomo Core 已存在:', corePath);
    console.log('');
    console.log('如需更新，请手动删除该文件后重新运行此脚本。');
    console.log('');
    process.exit(0);
}

if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
    console.log('✅ 已创建目录:', binDir);
    console.log('');
}

console.log('📦 当前平台:', isWindows ? 'Windows' : 'Linux');
console.log('📁 目标目录:', binDir);
console.log('');
console.log('⚠️  由于网络限制，请手动下载 Mihomo Core:');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('1️⃣  访问 GitHub Release 页面:');
console.log('   https://github.com/MetaCubeX/mihomo/releases');
console.log('');
console.log('2️⃣  下载对应平台的文件:');

if (isWindows) {
    console.log('   🪟 Windows 用户:');
    console.log('      - 下载: mihomo-windows-amd64-{版本}.zip');
    console.log('      - 解压后，将 mihomo.exe 重命名并放到:');
    console.log('        ' + corePath);
} else {
    console.log('   🐧 Linux 用户:');
    console.log('      - 下载: mihomo-linux-amd64-{版本}.gz');
    console.log('      - 解压后，将可执行文件重命名为 mihomo 并放到:');
    console.log('        ' + corePath);
    console.log('      - 添加执行权限: chmod +x ' + corePath);
}

console.log('');
console.log('3️⃣  完成后，刷新网页并点击"立即扫描"即可启用 Clash 真机测试！');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('💡 提示:');
console.log('   - 如果下载慢，可以使用 GitHub 加速镜像');
console.log('   - 推荐版本: v1.18.0 或更新版本');
console.log('   - 文件大小约: 10-15MB');
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
