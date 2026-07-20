import 'dotenv/config';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 8787);
const app = createApp();

app.listen(port, () => {
  console.log(`漫游山东运行中 → http://localhost:${port} (${process.env.NODE_ENV})`);
  if (process.env.NODE_ENV === 'production') {
    console.log('  前端已托管在 Express 静态文件服务中');
  } else {
    console.log('  前端请单独启动: cd apps/web && pnpm dev');
  }
});
