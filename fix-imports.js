import fs from 'fs';
import path from 'path';

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.ts')) {
      let content = fs.readFileSync(p, 'utf8');
      content = content.replace(/from\s+['"](\.[^'"]+)['"]/g, (match, p1) => {
        if (p1.endsWith('.js') || p1.endsWith('.json')) return match;
        return 'from "' + p1 + '.js"';
      });
      content = content.replace(/import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g, (match, p1) => {
        if (p1.endsWith('.js') || p1.endsWith('.json')) return match;
        return 'import("' + p1 + '.js")';
      });
      fs.writeFileSync(p, content);
    }
  }
}
walk('api');
walk('server');
