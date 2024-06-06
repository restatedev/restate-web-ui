import { setupServer } from 'msw/node';
import { cloudApiMockHandlers } from '@restate/data-access/cloud/api-fixtures';

const server = setupServer(...cloudApiMockHandlers);
server.events.on('request:start', ({ request }) => {
  console.log('MSW intercepted:', request.method, request.url);
});
server.listen();
