import util from 'node:util';
import { exec } from 'node:child_process';
const utilExec = util.promisify(exec);

const users = [
  {
    name: 'admin',
    email: '1@qq.com',
  },
  {
    name: 'user1',
    email: '2@qq.com',
  },
];

async function run() {
  const promises = users.map(async (user) => {
    try {
      await utilExec(
        `npx wrangler d1 execute hono-prisma-db --command "INSERT INTO  \"User\" (\"email\", \"name\") VALUES  ('${user.email}', '${user.name}');" --local`
      );
    } catch (error) {
      console.error(error);
    }
  });
  await Promise.all(promises);
}

run();
