import { Hono } from 'hono';
import { jwt, sign, decode } from 'hono/jwt';
import { HTTPException } from 'hono/http-exception';
import { setCookie, getCookie } from 'hono/cookie';
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { renderer } from './renderer';
import Login from './Login';

type Bindings = {
  MY_BUCKET: R2Bucket;
  MY_JWT_SECRET: string;
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(renderer);

app.get('/', (c) => {
  return c.render(
    <h1 class="text-3xl font-bold underline">Hello!</h1>,
    { title: '首页' }
  );
});

app.get('/login', async (c) => {
  return c.render(<Login />, { title: '登录' });
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

export default app;
