import { Hono } from 'hono';
import { jwt, sign, decode } from 'hono/jwt';
import { HTTPException } from 'hono/http-exception';
import { setCookie, getCookie } from 'hono/cookie';
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { renderer } from './renderer';
import Login from './Login';
import Register from './Register';
import Lists from './Lists';
import Uploader from './Uploader';

type Bindings = {
  MY_BUCKET: R2Bucket;
  MY_JWT_SECRET: string;
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.notFound((c) => {
  return c.text('Custom 404 Not Found', 404);
});

app.onError((err, c) => {
  console.error(`${err}`);
  if (err instanceof HTTPException) {
    if (err.status === 401) {
      return c.redirect('/login');
    }
  }
  return c.text('Custom Error Message', 500);
});

app.use(renderer);

app.use('/auth/*', (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.MY_JWT_SECRET,
    cookie: 'auth_token',
  });
  return jwtMiddleware(c, next);
});

app.get('/', (c) => {
  return c.render(
    <h1 class="text-3xl font-bold underline">Hello!</h1>,
    { title: '首页' }
  );
});

app.get('/login', async (c) => {
  return c.render(<Login />, { title: '登录' });
});
app.get('/register', async (c) => {
  return c.render(<Register />, { title: '注册' });
});

app.post('/register', async (c, next) => {
  const adapter = new PrismaD1(c.env.DB);
  const prisma = new PrismaClient({ adapter });
  const body = await c.req.formData();
  const email = body.get('email') as string;
  const password = body.get('password');
  const user = await prisma.user.create({
    data: { email },
  });
  if (user) {
    return c.redirect('/login');
  } else {
    return c.json({ error: 'Invalid username or password' }, 401);
  }
});

app.post('/login', async (c, next) => {
  const adapter = new PrismaD1(c.env.DB);
  const prisma = new PrismaClient({ adapter });
  const body = await c.req.formData();
  const email = body.get('email') as string;
  const password = body.get('password');
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (user) {
    const payload = {
      sub: user.id,
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + 60 * 1440, // Token expires in 5 minutes
    };
    const secret = c.env.MY_JWT_SECRET;
    const token = await sign(payload, secret);
    await setCookie(c, 'auth_token', token, {
      secure: true,
      httpOnly: true,
      sameSite: 'Strict',
    });
    return c.redirect('/');
  } else {
    return c.json({ error: 'Invalid username or password' }, 401);
  }
});

app.post('/auth/upload', async (c, next) => {
  const body = await c.req.parseBody();
  const file = body['file'] as File;
  if (!file) {
    return c.json({ error: 'No file uploaded' }, 400);
  }
  const fileName = `${Date.now()}-${file.name}`;
  await c.env.MY_BUCKET.put(fileName, file);
  return c.text(
    `Put https://memos-assets.leoho.dev/${fileName} successfully!`
  );
});

app.get('/auth/list', async (c) => {
  const res = await c.env.MY_BUCKET.list();
  return c.render(<Lists list={res.objects} />, { title: '列表' });
});

app.get('/upload', async (c) => {
  return c.render(<Uploader />, { title: '上传' });
});

export default app;
