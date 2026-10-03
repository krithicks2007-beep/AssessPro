const fs = require('fs');

const createRouteFile = (filename, content, requiresAuth = true) => {
  let header = `import express from 'express';\nimport { supabase, SUPER_ADMIN_EMAIL, ALLOWED_DOMAIN } from '../config/db.js';\n`;
  if (requiresAuth) {
    header += `import { verifyAuth, requireRoles, requireOwnEmail } from '../middlewares/authMiddleware.js';\n`;
  }
  
  // Some endpoints use resolveRoleFromEmail, but we don't have it exported from authMiddleware or maybe we do? Let's export it.
  header += `import { resolveRoleFromEmail } from '../middlewares/authMiddleware.js';\n\n`;

  // We need to bring in userRoleOverrides because some endpoints use it directly.
  // Actually, wait, userRoleOverrides is a Map. Let's create a global store for it.
  header += `import { userRoleOverrides } from '../config/store.js';\n\n`;

  header += `const router = express.Router();\n\n`;
  
  let modifiedContent = content.replace(/app\.(get|post|put|delete|patch)\(/g, 'router.$1(');
  
  fs.writeFileSync(`src/routes/${filename}`, header + modifiedContent + `\n\nexport default router;\n`);
};

// Create store.js for shared in-memory variables
fs.writeFileSync('src/config/store.js', `export const userRoleOverrides = new Map();\n`);

const mapping = [
  { temp: '_temp_auth.txt', out: 'authRoutes.js' },
  { temp: '_temp_profile.txt', out: 'profileRoutes.js' },
  { temp: '_temp_staff_profile.txt', out: 'staffProfileRoutes.js' },
  { temp: '_temp_groups.txt', out: 'groupRoutes.js' },
  { temp: '_temp_tests.txt', out: 'testRoutes.js' },
  { temp: '_temp_admin.txt', out: 'adminRoutes.js' }
];

mapping.forEach(m => {
  if (fs.existsSync(`src/routes/${m.temp}`)) {
    const content = fs.readFileSync(`src/routes/${m.temp}`, 'utf8');
    createRouteFile(m.out, content);
  }
});

console.log("Routes created successfully.");
