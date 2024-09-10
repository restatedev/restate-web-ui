const port = process.env.PORT ? Number(process.env.PORT) : 4001;
const ADMIN_ENDPOINT = process.env.ADMIN_ENDPOINT ?? 'http://localhost:9070';
import express, { RequestHandler } from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

const proxyHandler: RequestHandler = async (req, res) => {
  const response = await fetch(`${ADMIN_ENDPOINT}${req.url}`, {
    method: req.method,
    headers: new Headers(req.headers as Record<string, string>),
    ...(req.body &&
      ['POST', 'PUT'].includes(req.method) && {
        body: JSON.stringify(req.body),
      }),
  });

  response.body?.pipeTo(
    new WritableStream({
      start() {
        res.statusCode = response.status;
        response.headers.forEach((v, n) => res.setHeader(n, v));
      },
      write(chunk) {
        res.write(chunk);
      },
      close() {
        res.end();
      },
    })
  );
};

app.all('*', proxyHandler);
app.listen(port);
