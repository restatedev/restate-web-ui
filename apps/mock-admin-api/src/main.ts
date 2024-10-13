import { adminApiMockHandlers } from '@restate/data-access/admin-api-fixtures';

const port = process.env.PORT ? Number(process.env.PORT) : 4001;

import { createMiddleware } from '@mswjs/http-middleware';
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());
app.use(createMiddleware(...adminApiMockHandlers));

app.listen(port);
