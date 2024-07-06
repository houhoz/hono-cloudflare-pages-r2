const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

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
      await exec(
        `npx wrangler d1 execute hono-prisma-db --command "INSERT INTO  \"User\" (\"email\", \"name\") VALUES  ('${user.email}', '${user.name}');" --remote`
      );
    } catch (error) {
      console.error(error);
    }
  });
  await Promise.all(promises);
}

run();
