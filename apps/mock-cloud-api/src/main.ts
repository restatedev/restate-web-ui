import { createServer } from '@mswjs/http-middleware';
import { cloudApiMockHandlers } from '@restate/data-access/cloud/api-fixtures';

const httpServer = createServer(...cloudApiMockHandlers);

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
httpServer.listen(port);
