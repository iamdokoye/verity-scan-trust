import { app } from './app';
import { env } from './config/env';

const port = parseInt(env.PORT, 10);

app.listen(port, () => {
  console.log(`🛡️  Votta API listening on http://localhost:${port}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
});
