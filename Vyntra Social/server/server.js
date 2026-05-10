import app from './app.js';

const preferredPort = Number(process.env.PORT || 3000);

function listen(port) {
  const server = app.listen(port, () => {
    console.log(`Vyntra Social is running at http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.log(`Port ${port} is in use, trying ${nextPort}...`);
      listen(nextPort);
      return;
    }

    throw error;
  });
}

listen(preferredPort);
