import { cloudApiMockHandlers } from '@restate/data-access/cloud/api-fixtures';

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

import { createMiddleware } from '@mswjs/http-middleware';
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());
app.use(createMiddleware(...cloudApiMockHandlers));

app.listen(port);
