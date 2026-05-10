import { pathToFileURL } from 'url';

import app from './server/app.js';

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const port = Number(process.env.PORT || 3000);

  app.listen(port, () => {
    console.log(`Vyntra Social is running at http://localhost:${port}`);
  });
}

export default app;
