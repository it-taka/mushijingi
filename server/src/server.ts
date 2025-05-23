import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { setupSocketHandlers } from './socket/handlers';

// ポート設定
const PORT = process.env.PORT || 3001;

// HTTPサーバーの作成
const server = http.createServer(app);

// Socket.IOの設定
const io = new Server(server, {
  cors: {
    origin: '*', // 開発環境では全てのオリジンを許可
    methods: ['GET', 'POST']
  }
});

// ソケットハンドラの設定
setupSocketHandlers(io);

// サーバー起動
server.listen(PORT, () => {
  console.log(`サーバーがポート${PORT}で起動しました`);
});

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('サーバーをシャットダウンしています...');
  server.close(() => {
    console.log('サーバーが正常にシャットダウンしました');
    process.exit(0);
  });
});